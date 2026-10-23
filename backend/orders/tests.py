from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from kitchens.models import Kitchen, Tiffin
from .models import Order


class OrderWorkflowTests(APITestCase):
    def setUp(self):
        self.provider = User.objects.create_user(
            email="provider@example.com", name="Kitchen Cook", role=User.Role.PROVIDER, password="test-password"
        )
        self.customer = User.objects.create_user(
            email="customer@example.com", name="A Customer", role=User.Role.CUSTOMER, password="test-password"
        )
        self.other_customer = User.objects.create_user(
            email="other@example.com", name="Other Customer", role=User.Role.CUSTOMER, password="test-password"
        )
        self.kitchen = Kitchen.objects.create(
            provider=self.provider,
            name="Ghar Ka Khana",
            description="Everyday meals",
            locality="Old Town",
            address="5 Market Road",
            food_preferences="Vegetarian",
        )
        self.tiffin = Tiffin.objects.create(
            kitchen=self.kitchen,
            name="Dal, rice & roti",
            description="Fresh lunch",
            category=Tiffin.Category.LUNCH,
            price="125.50",
        )

    def create_order(self, customer=None):
        self.client.force_authenticate(customer or self.customer)
        return self.client.post(
            "/api/orders/",
            {
                "tiffin_id": self.tiffin.id,
                "quantity": 2,
                "delivery_address": "Hostel 4, North Campus",
                "instructions": "Please call on arrival",
            },
            format="json",
        )

    def test_order_uses_server_price_and_keeps_item_snapshot(self):
        response = self.create_order()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_amount"], "251.00")
        item = response.data["items"][0]
        self.assertEqual(item["tiffin_name"], "Dal, rice & roti")
        self.assertEqual(item["unit_price"], "125.50")
        self.tiffin.name = "Updated menu name"
        self.tiffin.price = "200.00"
        self.tiffin.save()
        self.client.force_authenticate(self.customer)
        detail = self.client.get(f"/api/orders/{response.data['id']}/")
        self.assertEqual(detail.data["items"][0]["tiffin_name"], "Dal, rice & roti")
        self.assertEqual(detail.data["items"][0]["unit_price"], "125.50")

    def test_order_rejects_invalid_quantity_and_unavailable_tiffin(self):
        self.client.force_authenticate(self.customer)
        invalid = self.client.post(
            "/api/orders/",
            {"tiffin_id": self.tiffin.id, "quantity": 0, "delivery_address": "Address"},
            format="json",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        blank_address = self.client.post(
            "/api/orders/",
            {"tiffin_id": self.tiffin.id, "quantity": 1, "delivery_address": "   "},
            format="json",
        )
        self.assertEqual(blank_address.status_code, status.HTTP_400_BAD_REQUEST)
        self.tiffin.is_available = False
        self.tiffin.save()
        unavailable = self.client.post(
            "/api/orders/",
            {"tiffin_id": self.tiffin.id, "quantity": 1, "delivery_address": "Address"},
            format="json",
        )
        self.assertEqual(unavailable.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Order.objects.count(), 0)

    def test_other_customer_cannot_view_order(self):
        response = self.create_order()
        self.client.force_authenticate(self.other_customer)
        detail = self.client.get(f"/api/orders/{response.data['id']}/")
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get("/api/orders/").data, [])

    def test_provider_order_transitions_are_validated(self):
        response = self.create_order()
        order_id = response.data["id"]
        self.client.force_authenticate(self.provider)
        malformed = self.client.patch(f"/api/orders/{order_id}/status/", {"status": ["READY"]})
        self.assertEqual(malformed.status_code, status.HTTP_400_BAD_REQUEST)
        invalid = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "READY"})
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        accepted = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "ACCEPTED"})
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(accepted.data["status"], Order.Status.ACCEPTED)
        self.client.patch(f"/api/orders/{order_id}/status/", {"status": "PREPARING"})
        self.client.patch(f"/api/orders/{order_id}/status/", {"status": "READY"})
        completed = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "COMPLETED"})
        self.assertEqual(completed.data["status"], Order.Status.COMPLETED)
        reopened = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "ACCEPTED"})
        self.assertEqual(reopened.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_can_only_cancel_pending_order(self):
        response = self.create_order()
        order_id = response.data["id"]
        self.client.force_authenticate(self.customer)
        cancelled = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "CANCELLED"})
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        self.assertEqual(cancelled.data["status"], Order.Status.CANCELLED)
        reopened = self.client.patch(f"/api/orders/{order_id}/status/", {"status": "CANCELLED"})
        self.assertEqual(reopened.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_customers_can_place_orders(self):
        response = self.create_order(self.provider)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_and_provider_order_lists_are_scoped(self):
        response = self.create_order()
        self.client.force_authenticate(self.customer)
        customer_orders = self.client.get("/api/orders/")
        self.assertEqual([order["id"] for order in customer_orders.data], [response.data["id"]])
        self.client.force_authenticate(self.provider)
        provider_orders = self.client.get("/api/orders/")
        self.assertEqual([order["id"] for order in provider_orders.data], [response.data["id"]])
        other_provider = User.objects.create_user(
            email="another-provider@example.com",
            name="Another Provider",
            role=User.Role.PROVIDER,
            password="test-password",
        )
        self.client.force_authenticate(other_provider)
        self.assertEqual(self.client.get("/api/orders/").data, [])
        self.assertEqual(
            self.client.get(f"/api/orders/{response.data['id']}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
