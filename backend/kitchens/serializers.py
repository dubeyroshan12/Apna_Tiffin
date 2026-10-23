from rest_framework import serializers

from .models import Kitchen, Tiffin


class TiffinSerializer(serializers.ModelSerializer):
    kitchen_name = serializers.CharField(source="kitchen.name", read_only=True)

    class Meta:
        model = Tiffin
        fields = (
            "id",
            "kitchen",
            "kitchen_name",
            "name",
            "description",
            "category",
            "food_preference",
            "cuisine",
            "food_category",
            "meal_plan",
            "price",
            "image_url",
            "is_available",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "kitchen", "created_at", "updated_at")


class KitchenSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    tiffins = TiffinSerializer(many=True, read_only=True)
    available_tiffin_count = serializers.SerializerMethodField()

    def get_available_tiffin_count(self, obj):
        if "available_tiffin_count" in obj.__dict__:
            return obj.__dict__["available_tiffin_count"]
        return obj.tiffins.filter(is_available=True).count()

    class Meta:
        model = Kitchen
        fields = (
            "id",
            "name",
            "description",
            "locality",
            "address",
            "contact_phone",
            "food_preferences",
            "operating_hours",
            "is_active",
            "provider_name",
            "available_tiffin_count",
            "tiffins",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
