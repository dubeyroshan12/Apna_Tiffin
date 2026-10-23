from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Kitchen(models.Model):
    provider = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kitchen"
    )
    name = models.CharField(max_length=120)
    description = models.TextField()
    locality = models.CharField(max_length=120)
    address = models.TextField()
    contact_phone = models.CharField(max_length=20, blank=True)
    food_preferences = models.CharField(max_length=120, help_text="For example: Vegetarian, Jain")
    operating_hours = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        indexes = [models.Index(fields=["locality", "is_active"])]

    def __str__(self):
        return self.name


class Tiffin(models.Model):
    class Category(models.TextChoices):
        LUNCH = "LUNCH", "Lunch"
        DINNER = "DINNER", "Dinner"
        BOTH = "BOTH", "Lunch & dinner"
        BREAKFAST = "BREAKFAST", "Breakfast"

    class Cuisine(models.TextChoices):
        NORTH_INDIAN = "NORTH_INDIAN", "North Indian"
        SOUTH_INDIAN = "SOUTH_INDIAN", "South Indian"
        OTHER = "OTHER", "Other"

    class FoodCategory(models.TextChoices):
        THALI = "THALI", "Thalis"
        COMPLETE_MEAL = "COMPLETE_MEAL", "Complete meals"
        ROTI = "ROTI", "Roti"
        PARATHA = "PARATHA", "Paratha"
        RICE = "RICE", "Rice"
        DAL = "DAL", "Dal"
        SABZI = "SABZI", "Sabzi"
        SNACK = "SNACK", "Snacks & light meals"
        IDLI_DOSA = "IDLI_DOSA", "Idli & dosa"
        OTHER = "OTHER", "Other"

    class MealPlan(models.TextChoices):
        ONE_TIME = "ONE_TIME", "Single meal"
        DAILY = "DAILY", "Daily plan"
        WEEKLY = "WEEKLY", "Weekly plan"
        MONTHLY = "MONTHLY", "Monthly plan"

    kitchen = models.ForeignKey(Kitchen, on_delete=models.CASCADE, related_name="tiffins")
    name = models.CharField(max_length=120)
    description = models.TextField()
    category = models.CharField(max_length=12, choices=Category.choices)
    food_preference = models.CharField(max_length=30, default="Vegetarian")
    cuisine = models.CharField(max_length=20, choices=Cuisine.choices, default=Cuisine.OTHER)
    food_category = models.CharField(
        max_length=20, choices=FoodCategory.choices, default=FoodCategory.COMPLETE_MEAL
    )
    meal_plan = models.CharField(max_length=10, choices=MealPlan.choices, default=MealPlan.ONE_TIME)
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    image_url = models.URLField(blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        indexes = [models.Index(fields=["kitchen", "is_available"])]

    def __str__(self):
        return f"{self.name} · {self.kitchen.name}"
