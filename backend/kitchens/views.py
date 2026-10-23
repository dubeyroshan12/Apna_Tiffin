from decimal import Decimal, InvalidOperation

from django.db.models import Count, Min, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from .models import Kitchen, Tiffin
from .permissions import IsProvider
from .serializers import KitchenSerializer, TiffinSerializer


def active_kitchens():
    return Kitchen.objects.filter(is_active=True).annotate(
        available_tiffin_count=Count("tiffins", filter=Q(tiffins__is_available=True))
    ).prefetch_related(
        Prefetch("tiffins", queryset=Tiffin.objects.filter(is_available=True)),
        "provider",
    )


class KitchenListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        preference = request.query_params.get("preference", "").strip()
        category = request.query_params.get("category", "").strip()
        cuisine = request.query_params.get("cuisine", "").strip()
        food_category = request.query_params.get("food_category", "").strip()
        meal_plan = request.query_params.get("meal_plan", "").strip()
        max_price = request.query_params.get("max_price")
        ordering = request.query_params.get("ordering", "name").strip()
        matching_tiffins = Tiffin.objects.filter(is_available=True)
        if preference:
            matching_tiffins = matching_tiffins.filter(food_preference__iexact=preference)
        if category:
            matching_tiffins = matching_tiffins.filter(category=category)
        if cuisine:
            matching_tiffins = matching_tiffins.filter(cuisine=cuisine)
        if food_category:
            matching_tiffins = matching_tiffins.filter(food_category=food_category)
        if meal_plan:
            matching_tiffins = matching_tiffins.filter(meal_plan=meal_plan)
        if max_price:
            try:
                maximum = Decimal(max_price)
                if not maximum.is_finite() or maximum < 0:
                    raise ValueError
                matching_tiffins = matching_tiffins.filter(price__lte=maximum)
            except (InvalidOperation, TypeError, ValueError):
                return Response({"max_price": ["Enter a valid non-negative amount."]}, status=400)

        queryset = Kitchen.objects.filter(is_active=True).annotate(
            available_tiffin_count=Count("tiffins", filter=Q(tiffins__in=matching_tiffins)),
            minimum_tiffin_price=Min("tiffins__price", filter=Q(tiffins__in=matching_tiffins)),
        )
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(locality__icontains=search)
                | Q(description__icontains=search)
                | Q(tiffins__name__icontains=search, tiffins__is_available=True)
            )
        has_listing_filters = any((preference, category, cuisine, food_category, meal_plan, max_price))
        if has_listing_filters:
            queryset = queryset.filter(tiffins__in=matching_tiffins)
        queryset = queryset.prefetch_related(
            Prefetch("tiffins", queryset=matching_tiffins),
            "provider",
        )
        if ordering == "price_asc":
            queryset = queryset.order_by("minimum_tiffin_price", "name")
        elif ordering == "price_desc":
            queryset = queryset.order_by("-minimum_tiffin_price", "name")
        else:
            queryset = queryset.order_by("name")
        queryset = queryset.distinct()[:60]
        return Response(KitchenSerializer(queryset, many=True).data)


class KitchenDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        kitchen = get_object_or_404(active_kitchens(), pk=pk)
        data = KitchenSerializer(kitchen).data
        if not (request.user.is_authenticated and request.user.id == kitchen.provider_id):
            data["tiffins"] = [
                tiffin for tiffin in data["tiffins"] if tiffin["is_available"]
            ]
        return Response(data)


class MyKitchenView(APIView):
    permission_classes = [IsAuthenticated, IsProvider]

    def get(self, request):
        kitchen = Kitchen.objects.filter(provider=request.user).first()
        if not kitchen:
            return Response(None)
        kitchen = Kitchen.objects.annotate(
            available_tiffin_count=Count("tiffins", filter=Q(tiffins__is_available=True))
        ).get(pk=kitchen.pk)
        return Response(KitchenSerializer(kitchen).data)

    def post(self, request):
        if Kitchen.objects.filter(provider=request.user).exists():
            return Response({"detail": "You already have a kitchen profile."}, status=400)
        serializer = KitchenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        kitchen = serializer.save(provider=request.user)
        return Response(KitchenSerializer(kitchen).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        kitchen = get_object_or_404(Kitchen, provider=request.user)
        serializer = KitchenSerializer(kitchen, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(KitchenSerializer(serializer.save()).data)

    def delete(self, request):
        kitchen = get_object_or_404(Kitchen, provider=request.user)
        kitchen.is_active = False
        kitchen.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class TiffinListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsProvider()]

    def get(self, request):
        queryset = Tiffin.objects.select_related("kitchen").filter(
            kitchen__is_active=True, is_available=True
        )
        kitchen_id = request.query_params.get("kitchen")
        if kitchen_id:
            queryset = queryset.filter(kitchen_id=kitchen_id)
        return Response(TiffinSerializer(queryset[:100], many=True).data)

    def post(self, request):
        kitchen = get_object_or_404(Kitchen, provider=request.user)
        serializer = TiffinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tiffin = serializer.save(kitchen=kitchen)
        return Response(TiffinSerializer(tiffin).data, status=status.HTTP_201_CREATED)


class TiffinDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsProvider()]

    def get(self, request, pk):
        tiffin = get_object_or_404(Tiffin.objects.select_related("kitchen"), pk=pk)
        if not tiffin.is_available or not tiffin.kitchen.is_active:
            return Response({"detail": "Tiffin not found."}, status=404)
        return Response(TiffinSerializer(tiffin).data)

    def patch(self, request, pk):
        tiffin = get_object_or_404(Tiffin, pk=pk, kitchen__provider=request.user)
        serializer = TiffinSerializer(tiffin, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(TiffinSerializer(serializer.save()).data)

    def delete(self, request, pk):
        tiffin = get_object_or_404(Tiffin, pk=pk, kitchen__provider=request.user)
        if tiffin.order_items.exists():
            tiffin.is_available = False
            tiffin.save(update_fields=["is_available", "updated_at"])
        else:
            tiffin.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
