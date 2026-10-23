from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import CustomerProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "name", "email", "role", "date_joined")
        read_only_fields = fields


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("name", "email", "password", "password_confirm", "role")

    def validate_role(self, value):
        if value not in (User.Role.CUSTOMER, User.Role.PROVIDER):
            raise serializers.ValidationError("Choose customer or kitchen provider.")
        return value

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"].strip(),
            role=validated_data["role"],
        )
        if user.role == User.Role.CUSTOMER:
            CustomerProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return value.strip().lower()


class ProfileSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="customer_profile.phone", required=False, allow_blank=True)
    default_address = serializers.CharField(
        source="customer_profile.default_address", required=False, allow_blank=True
    )

    class Meta:
        model = User
        fields = ("id", "name", "email", "role", "phone", "default_address")
        read_only_fields = ("id", "email", "role")

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("customer_profile", {})
        instance.name = validated_data.get("name", instance.name).strip()
        instance.save(update_fields=["name", "updated_at"])
        if instance.role == User.Role.CUSTOMER:
            profile, _ = CustomerProfile.objects.get_or_create(user=instance)
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()
        return instance
