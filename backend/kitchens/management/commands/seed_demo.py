from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from kitchens.models import Kitchen, Tiffin


class Command(BaseCommand):
    help = "Create clearly labelled, fictional Apna Tiffin demonstration kitchens and tiffins."

    @transaction.atomic
    def handle(self, *args, **options):
        kitchens = [
            {
                "email": "demo-aangan@example.invalid",
                "owner": "Demo cook · Aangan",
                "name": "Demo · Aangan Kitchen",
                "description": "A demonstration home kitchen sharing comforting North Indian everyday meals.",
                "locality": "North Campus",
                "address": "Demonstration listing · North Campus",
                "food_preferences": "Vegetarian",
                "operating_hours": "Mon–Sat · 11:00–21:00",
                "meals": [
                    ("Simple homemade veg thali", "Dal, rice, two rotis, seasonal sabzi and a little pickle.", "LUNCH", "Vegetarian", "THALI", "NORTH_INDIAN", "DAILY", "155.00"),
                    ("Dal, rice, roti & seasonal sabzi", "A homestyle serving of yellow dal, steamed rice, fresh roti and seasonal vegetables.", "LUNCH", "Vegetarian", "COMPLETE_MEAL", "NORTH_INDIAN", "DAILY", "125.00"),
                    ("Rajma chawal", "Slow-cooked kidney beans served with steamed rice.", "LUNCH", "Vegetarian", "RICE", "NORTH_INDIAN", "ONE_TIME", "130.00"),
                    ("Homestyle dal tadka", "Yellow lentils tempered with cumin, garlic and mild spices.", "DINNER", "Vegetarian", "DAL", "NORTH_INDIAN", "ONE_TIME", "105.00"),
                    ("Seasonal sabzi with roti", "A simple seasonal vegetable sabzi served with fresh roti.", "LUNCH", "Vegetarian", "SABZI", "NORTH_INDIAN", "DAILY", "110.00"),
                    ("Paneer thali", "Paneer curry, dal, rice, roti and seasonal accompaniments.", "DINNER", "Vegetarian", "THALI", "NORTH_INDIAN", "ONE_TIME", "190.00"),
                    ("Aloo paratha with curd", "Two stuffed potato parathas with fresh curd and pickle.", "BREAKFAST", "Vegetarian", "PARATHA", "NORTH_INDIAN", "ONE_TIME", "95.00"),
                    ("Evening samosa & chai snack box", "A light fictional sample snack with two baked samosas.", "BOTH", "Vegetarian", "SNACK", "NORTH_INDIAN", "ONE_TIME", "70.00"),
                ],
            },
            {
                "email": "demo-swaad@example.invalid",
                "owner": "Demo cook · Ghar ka Swaad",
                "name": "Demo · Ghar ka Swaad",
                "description": "A fictional demo listing for fresh, simple meals made in small batches.",
                "locality": "Old Town",
                "address": "Demonstration listing · Old Town",
                "food_preferences": "Vegetarian · Jain",
                "operating_hours": "Daily · 08:00–20:00",
                "meals": [
                    ("Idli, sambar & coconut chutney", "Steamed idlis served with sambar and coconut chutney.", "BREAKFAST", "Vegetarian", "IDLI_DOSA", "SOUTH_INDIAN", "ONE_TIME", "90.00"),
                    ("Masala dosa breakfast", "Crisp dosa with potato masala, sambar and chutney.", "BREAKFAST", "Vegetarian", "IDLI_DOSA", "SOUTH_INDIAN", "WEEKLY", "115.00"),
                    ("Lemon rice & vegetable poriyal", "South Indian style lemon rice with seasonal vegetable poriyal.", "LUNCH", "Vegetarian", "RICE", "SOUTH_INDIAN", "ONE_TIME", "125.00"),
                    ("Poha breakfast bowl", "Light poha with peanuts, lemon and fresh coriander.", "BREAKFAST", "Vegetarian", "SNACK", "NORTH_INDIAN", "ONE_TIME", "75.00"),
                    ("Chole chawal", "Chickpeas simmered in a mild masala and served with rice.", "LUNCH", "Vegetarian", "RICE", "NORTH_INDIAN", "MONTHLY", "135.00"),
                ],
            },
            {
                "email": "demo-nani@example.invalid",
                "owner": "Demo cook · Nani's Rasoi",
                "name": "Demo · Nani's Rasoi",
                "description": "A sample neighborhood kitchen profile for the Apna Tiffin demo.",
                "locality": "Lake Road",
                "address": "Demonstration listing · Lake Road",
                "food_preferences": "Vegetarian · Non-vegetarian",
                "operating_hours": "Mon–Fri · 12:00–20:00",
                "meals": [
                    ("Seasonal home thali", "A rotating seasonal sabzi, dal, rice and fresh rotis.", "LUNCH", "Vegetarian", "THALI", "NORTH_INDIAN", "WEEKLY", "145.00"),
                    ("Fresh roti with dal & sabzi", "Soft rotis with today's dal and a seasonal vegetable.", "DINNER", "Vegetarian", "ROTI", "NORTH_INDIAN", "DAILY", "120.00"),
                    ("Vegetable upma breakfast", "A light savory semolina breakfast with vegetables.", "BREAKFAST", "Vegetarian", "SNACK", "SOUTH_INDIAN", "ONE_TIME", "80.00"),
                    ("Egg curry with rice", "Boiled eggs in a homestyle curry served with rice.", "DINNER", "Non-vegetarian", "RICE", "NORTH_INDIAN", "ONE_TIME", "175.00"),
                    ("Chicken curry with rice", "Mild home-style chicken curry served with steamed rice.", "DINNER", "Non-vegetarian", "COMPLETE_MEAL", "NORTH_INDIAN", "MONTHLY", "220.00"),
                ],
            },
        ]
        created = 0
        for item in kitchens:
            provider, provider_created = User.objects.get_or_create(
                email=item["email"],
                defaults={"name": item["owner"], "role": User.Role.PROVIDER},
            )
            if provider.role != User.Role.PROVIDER:
                self.stderr.write(f"Skipped {item['name']}: {item['email']} is not a provider account.")
                continue
            if provider_created:
                provider.set_unusable_password()
                provider.save(update_fields=["password"])
            defaults = {
                "name": item["name"],
                "description": item["description"],
                "locality": item["locality"],
                "address": item["address"],
                "food_preferences": item["food_preferences"],
                "operating_hours": item["operating_hours"],
                "is_active": True,
            }
            kitchen = Kitchen.objects.filter(provider=provider).first()
            if kitchen and not kitchen.name.startswith("Demo · "):
                self.stderr.write(f"Skipped {item['name']}: {provider.email} already owns a non-demo kitchen.")
                continue
            if kitchen:
                for field, value in defaults.items():
                    setattr(kitchen, field, value)
                kitchen.save()
            else:
                kitchen = Kitchen.objects.create(provider=provider, **defaults)
            meal_names = {meal[0] for meal in item["meals"]}
            for name, description, category, preference, food_category, cuisine, meal_plan, price in item["meals"]:
                _, was_created = Tiffin.objects.update_or_create(
                    kitchen=kitchen,
                    name=name,
                    defaults={
                        "description": description,
                        "category": category,
                        "food_preference": preference,
                        "food_category": food_category,
                        "cuisine": cuisine,
                        "meal_plan": meal_plan,
                        "price": price,
                        "is_available": True,
                    },
                )
                created += int(was_created)
            Tiffin.objects.filter(kitchen=kitchen).exclude(name__in=meal_names).update(is_available=False)
        self.stdout.write(self.style.SUCCESS(f"Demo data ready: {Kitchen.objects.filter(name__startswith='Demo · ').count()} demo kitchens and {created} new tiffins."))
        self.stdout.write("Demo provider accounts use example.invalid email addresses and cannot log in.")
