from django.urls import path

from .views import OrderDetailView, OrderListCreateView, OrderStatusView

urlpatterns = [
    path("orders/", OrderListCreateView.as_view(), name="order-list"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:pk>/status/", OrderStatusView.as_view(), name="order-status"),
]
