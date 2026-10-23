from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Kitchen, Tiffin
from django.core.management import call_command


class KitchenPermissionTests(APITestCase):
    def setUp(self):
        self.provider = User.objects.create_user(
            email="cook@example.com", name="Home Cook", role=User.Role.PROVIDER, password="test-password"
        )
        self.other_provider = User.objects.create_user(
            email="other@example.com", name="Other Cook", role=User.Role.PROVIDER, password="test-password"
        )
        self.customer = User.objects.create_user(
            email="customer@example.com", name="Customer", role=User.Role.CUSTOMER, password="test-password"
        )
        self.kitchen = Kitchen.objects.create(
            provider=self.provider,
            name="Aangan Kitchen",
            description="Fresh home meals",
            locality="North Campus",
            address="1 College Road",
            food_preferences="Vegetarian",
        )
        self.tiffin = Tiffin.objects.create(
            kitchen=self.kitchen,
            name="Dal rice",
            description="A comforting everyday meal",
            category=Tiffin.Category.LUNCH,
            price="120.00",
        )

    def test_provider_can_create_and_update_own_kitchen(self):
        self.client.force_authenticate(self.other_provider)
        response = self.client.post(
            "/api/kitchens/mine/",
            {
                "name": "Nayi Rasoi",
                "description": "Home-cooked meals",
                "locality": "Central",
                "address": "2 Food Street",
                "food_preferences": "Jain",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Kitchen.objects.get(provider=self.other_provider).name, "Nayi Rasoi")
        response = self.client.patch(
            "/api/kitchens/mine/", {"name": "Nayi Rasoi Kitchen", "is_active": False}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated = Kitchen.objects.get(provider=self.other_provider)
        self.assertFalse(updated.is_active)

    def test_customer_cannot_manage_a_kitchen(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            "/api/kitchens/mine/",
            {"name": "Nope", "description": "Nope", "locality": "Here", "address": "There", "food_preferences": "Any"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_provider_cannot_edit_another_providers_tiffin(self):
        self.client.force_authenticate(self.other_provider)
        response = self.client.patch(f"/api/tiffins/{self.tiffin.id}/", {"price": "1.00"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.tiffin.refresh_from_db()
        self.assertEqual(str(self.tiffin.price), "120.00")

    def test_provider_can_create_update_and_delete_own_tiffin(self):
        self.client.force_authenticate(self.provider)
        created = self.client.post(
            "/api/tiffins/",
            {
                "name": "Fresh roti thali",
                "description": "Roti, dal and seasonal vegetables",
                "category": "DINNER",
                "food_preference": "Vegetarian",
                "price": "149.50",
            },
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["kitchen"], self.kitchen.id)
        tiffin_id = created.data["id"]
        updated = self.client.patch(
            f"/api/tiffins/{tiffin_id}/", {"price": "159.00", "is_available": False}
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["price"], "159.00")
        self.assertFalse(updated.data["is_available"])
        deleted = self.client.delete(f"/api/tiffins/{tiffin_id}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Tiffin.objects.filter(pk=tiffin_id).exists())

    def test_customer_cannot_create_tiffin(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            "/api/tiffins/",
            {
                "name": "Unauthorized meal",
                "description": "No",
                "category": "LUNCH",
                "price": "100.00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_sees_only_active_kitchens_and_available_tiffins(self):
        self.tiffin.is_available = False
        self.tiffin.save()
        response = self.client.get("/api/kitchens/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["tiffins"], [])
        self.tiffin.is_available = True
        self.tiffin.save()
        self.kitchen.is_active = False
        self.kitchen.save()
        self.assertEqual(self.client.get("/api/kitchens/").data, [])

    def test_discovery_filters_by_tiffin_name_cuisine_preference_and_categories(self):
        south_kitchen = Kitchen.objects.create(
            provider=self.other_provider,
            name="Southern Breakfast",
            description="Breakfast cooked fresh",
            locality="East Campus",
            address="3 Temple Road",
            food_preferences="Vegetarian",
        )
        south_meal = Tiffin.objects.create(
            kitchen=south_kitchen,
            name="Masala dosa and idli",
            description="Dosa, idli, sambar and chutney",
            category=Tiffin.Category.BREAKFAST,
            food_preference="Vegetarian",
            cuisine=Tiffin.Cuisine.SOUTH_INDIAN,
            food_category=Tiffin.FoodCategory.IDLI_DOSA,
            meal_plan=Tiffin.MealPlan.WEEKLY,
            price="95.00",
        )
        Tiffin.objects.create(
            kitchen=self.kitchen,
            name="Chicken curry with rice",
            description="Chicken curry with steamed rice",
            category=Tiffin.Category.DINNER,
            food_preference="Non-vegetarian",
            cuisine=Tiffin.Cuisine.NORTH_INDIAN,
            food_category=Tiffin.FoodCategory.RICE,
            meal_plan=Tiffin.MealPlan.MONTHLY,
            price="220.00",
        )

        response = self.client.get("/api/kitchens/?search=masala%20dosa")
        self.assertEqual([item["id"] for item in response.data], [south_kitchen.id])
        self.assertEqual(response.data[0]["tiffins"][0]["id"], south_meal.id)
        response = self.client.get(
            "/api/kitchens/?cuisine=SOUTH_INDIAN&category=BREAKFAST"
            "&food_category=IDLI_DOSA&meal_plan=WEEKLY&preference=Vegetarian"
        )
        self.assertEqual([item["id"] for item in response.data], [south_kitchen.id])
        self.assertEqual([item["name"] for item in response.data[0]["tiffins"]], ["Masala dosa and idli"])
        response = self.client.get("/api/kitchens/?preference=Non-vegetarian")
        self.assertEqual([item["name"] for item in response.data[0]["tiffins"]], ["Chicken curry with rice"])

    def test_discovery_sorts_by_lowest_matching_tiffin_price(self):
        south_kitchen = Kitchen.objects.create(
            provider=self.other_provider,
            name="Zesty Kitchen",
            description="Fresh meals",
            locality="East Campus",
            address="3 Temple Road",
            food_preferences="Vegetarian",
        )
        Tiffin.objects.create(
            kitchen=south_kitchen,
            name="Affordable dosa",
            description="Dosa and sambar",
            category=Tiffin.Category.BREAKFAST,
            food_preference="Vegetarian",
            cuisine=Tiffin.Cuisine.SOUTH_INDIAN,
            food_category=Tiffin.FoodCategory.IDLI_DOSA,
            price="80.00",
        )
        low_to_high = self.client.get("/api/kitchens/?ordering=price_asc")
        high_to_low = self.client.get("/api/kitchens/?ordering=price_desc")
        self.assertEqual(low_to_high.data[0]["id"], south_kitchen.id)
        self.assertEqual(high_to_low.data[0]["id"], self.kitchen.id)

    def test_demo_seed_is_repeatable_and_creates_varied_sample_meals(self):
        call_command("seed_demo", verbosity=0)
        first_counts = (Kitchen.objects.count(), Tiffin.objects.count())
        call_command("seed_demo", verbosity=0)
        self.assertEqual((Kitchen.objects.count(), Tiffin.objects.count()), first_counts)
        self.assertGreaterEqual(Tiffin.objects.filter(kitchen__name__startswith="Demo · ").count(), 15)
        self.assertTrue(Tiffin.objects.filter(cuisine=Tiffin.Cuisine.SOUTH_INDIAN).exists())
        self.assertTrue(Tiffin.objects.filter(food_preference="Non-vegetarian").exists())
        self.assertTrue(Tiffin.objects.filter(meal_plan=Tiffin.MealPlan.MONTHLY).exists())
        self.assertTrue(Tiffin.objects.filter(food_category=Tiffin.FoodCategory.DAL).exists())
        self.assertTrue(Tiffin.objects.filter(food_category=Tiffin.FoodCategory.SABZI).exists())
