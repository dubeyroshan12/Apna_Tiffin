from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "tiffin", "tiffin_name", "unit_price", "quantity", "line_total")
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    kitchen_name = serializers.CharField(source="kitchen.name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "kitchen",
            "kitchen_name",
            "customer_name",
            "items",
            "status",
            "delivery_address",
            "instructions",
            "total_amount",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class OrderCreateSerializer(serializers.Serializer):
    tiffin_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=50)
    delivery_address = serializers.CharField(max_length=1000)
    instructions = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_delivery_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter a delivery address.")
        return value
