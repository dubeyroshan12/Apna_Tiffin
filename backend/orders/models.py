from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders"
    )
    kitchen = models.ForeignKey("kitchens.Kitchen", on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    delivery_address = models.TextField()
    instructions = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["customer", "-created_at"]), models.Index(fields=["kitchen", "status"])]

    def __str__(self):
        return f"Order #{self.pk} · {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    tiffin = models.ForeignKey(
        "kitchens.Tiffin", on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items"
    )
    tiffin_name = models.CharField(max_length=120)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    quantity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])

    @property
    def line_total(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.quantity} × {self.tiffin_name}"
