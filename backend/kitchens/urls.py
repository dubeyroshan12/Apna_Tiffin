from django.urls import path

from .views import (
    KitchenDetailView,
    KitchenListView,
    MyKitchenView,
    TiffinDetailView,
    TiffinListCreateView,
)

urlpatterns = [
    path("kitchens/", KitchenListView.as_view(), name="kitchen-list"),
    path("kitchens/mine/", MyKitchenView.as_view(), name="my-kitchen"),
    path("kitchens/<int:pk>/", KitchenDetailView.as_view(), name="kitchen-detail"),
    path("tiffins/", TiffinListCreateView.as_view(), name="tiffin-list"),
    path("tiffins/<int:pk>/", TiffinDetailView.as_view(), name="tiffin-detail"),
]
