from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from kitchens.models import Kitchen, Tiffin
from .models import Order, OrderItem
from .serializers import OrderCreateSerializer, OrderSerializer


PROVIDER_TRANSITIONS = {
    Order.Status.PENDING: {Order.Status.ACCEPTED, Order.Status.REJECTED},
    Order.Status.ACCEPTED: {Order.Status.PREPARING},
    Order.Status.PREPARING: {Order.Status.READY},
    Order.Status.READY: {Order.Status.COMPLETED},
}


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == User.Role.CUSTOMER:
            queryset = Order.objects.filter(customer=request.user)
        elif request.user.role == User.Role.PROVIDER:
            queryset = Order.objects.filter(kitchen__provider=request.user)
        else:
            return Response({"detail": "This account cannot access orders."}, status=403)
        queryset = queryset.select_related("customer", "kitchen").prefetch_related("items")[:100]
        return Response(OrderSerializer(queryset, many=True).data)

    def post(self, request):
        if request.user.role != User.Role.CUSTOMER:
            return Response({"detail": "Only customers can place orders."}, status=403)
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            tiffin = get_object_or_404(
                Tiffin.objects.select_for_update().select_related("kitchen"),
                pk=serializer.validated_data["tiffin_id"],
                is_available=True,
                kitchen__is_active=True,
            )
            quantity = serializer.validated_data["quantity"]
            total = tiffin.price * quantity
            order = Order.objects.create(
                customer=request.user,
                kitchen=tiffin.kitchen,
                delivery_address=serializer.validated_data["delivery_address"].strip(),
                instructions=serializer.validated_data.get("instructions", "").strip(),
                total_amount=total,
            )
            OrderItem.objects.create(
                order=order,
                tiffin=tiffin,
                tiffin_name=tiffin.name,
                unit_price=tiffin.price,
                quantity=quantity,
            )
        order = Order.objects.select_related("customer", "kitchen").prefetch_related("items").get(pk=order.pk)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("customer", "kitchen").prefetch_related("items"), pk=pk
        )
        allowed = (
            request.user.is_staff
            or order.customer_id == request.user.id
            or order.kitchen.provider_id == request.user.id
        )
        if not allowed:
            return None
        return order

    def get(self, request, pk):
        order = self.get_object(request, pk)
        if order is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(OrderSerializer(order).data)


class OrderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("kitchen"), pk=pk
        )
        new_status = request.data.get("status")
        if request.user.role == User.Role.CUSTOMER and order.customer_id == request.user.id:
            if order.status != Order.Status.PENDING or new_status != Order.Status.CANCELLED:
                return Response(
                    {"detail": "Only pending orders can be cancelled by the customer."}, status=400
                )
        elif (
            request.user.role == User.Role.PROVIDER
            and order.kitchen.provider_id == request.user.id
        ):
            if not isinstance(new_status, str) or new_status not in PROVIDER_TRANSITIONS.get(
                order.status, set()
            ):
                return Response(
                    {"detail": f"Cannot move an order from {order.status} to {new_status}."},
                    status=400,
                )
        else:
            return Response({"detail": "Not found."}, status=404)
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        order = Order.objects.select_related("customer", "kitchen").prefetch_related("items").get(pk=order.pk)
        return Response(OrderSerializer(order).data)
