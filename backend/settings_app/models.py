from django.db import models


class SystemSettings(models.Model):
	PAYMENT_MODES = [
		("CASH", "Cash"),
		("ONLINE", "Online"),
	]

	CURRENCIES = [
		("INR", "INR (₹)"),
	]

	WEIGHT_UNITS = [
		("GRAM", "Gram (gm)"),
	]

	DECIMAL_CHOICES = [
		(0, "0"),
		(1, "1"),
		(2, "2"),
		(3, "3"),
		(4, "4"),
	]

	PAPER_SIZES = [
		("80MM", "80mm Thermal"),
		("58MM", "58mm Thermal"),
	]

	AUTO_LOGOUT_CHOICES = [
		(15, "15 Minutes"),
		(30, "30 Minutes"),
		(60, "60 Minutes"),
		(120, "120 Minutes"),
	]

	ENTRIES_PER_PAGE_CHOICES = [
		(10, "10"),
		(25, "25"),
		(50, "50"),
		(100, "100"),
	]

	THEME_CHOICES = [
		("LIGHT", "Light"),
		("DARK", "Dark"),
	]

	LANGUAGE_CHOICES = [
		("EN", "English"),
	]

	MACHINE_BAUD_CHOICES = [
		(9600, "9600"),
		(19200, "19200"),
		(38400, "38400"),
	]

	MACHINE_PARITY_CHOICES = [
		("NONE", "None"),
		("EVEN", "Even"),
		("ODD", "Odd"),
	]

	FINANCIAL_YEAR_START_CHOICES = [
		("01 April", "01 April"),
		("01 January", "01 January"),
		("01 July", "01 July"),
	]

	shop_name = models.CharField(max_length=150, default="Nellore Die Cutting")
	address = models.TextField(blank=True, default="")
	phone_number = models.CharField(max_length=15, blank=True, default="")
	email = models.EmailField(blank=True, default="")
	gst_number = models.CharField(max_length=30, blank=True, default="")
	business_registration_number = models.CharField(max_length=40, blank=True, default="")
	logo = models.FileField(upload_to="settings/logo/", blank=True, null=True)

	financial_year_start = models.CharField(
		max_length=20,
		choices=FINANCIAL_YEAR_START_CHOICES,
		default="01 April",
	)
	default_payment_mode = models.CharField(max_length=10, choices=PAYMENT_MODES, default="CASH")
	currency = models.CharField(max_length=10, choices=CURRENCIES, default="INR")
	weight_unit = models.CharField(max_length=10, choices=WEIGHT_UNITS, default="GRAM")
	weight_decimal_places = models.PositiveSmallIntegerField(choices=DECIMAL_CHOICES, default=3)
	amount_decimal_places = models.PositiveSmallIntegerField(choices=DECIMAL_CHOICES, default=2)
	show_discount = models.BooleanField(default=True)

	bill_paper_size = models.CharField(max_length=10, choices=PAPER_SIZES, default="80MM")
	token_paper_size = models.CharField(max_length=10, choices=PAPER_SIZES, default="58MM")
	show_bill_header = models.BooleanField(default=True)
	show_bill_footer = models.BooleanField(default=True)
	bill_prefix = models.CharField(max_length=10, default="BILL")
	token_prefix = models.CharField(max_length=10, default="TK")

	low_weight_alert = models.BooleanField(default=True)
	whatsapp_daily_summary = models.BooleanField(default=False)
	backup_reminder = models.BooleanField(default=True)
	bill_print_sound = models.BooleanField(default=True)
	allow_token_edit = models.BooleanField(default=False)

	auto_logout_minutes = models.PositiveSmallIntegerField(choices=AUTO_LOGOUT_CHOICES, default=30)
	entries_per_page = models.PositiveSmallIntegerField(choices=ENTRIES_PER_PAGE_CHOICES, default=10)
	theme_mode = models.CharField(max_length=10, choices=THEME_CHOICES, default="LIGHT")
	language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default="EN")

	weighing_machine_enabled = models.BooleanField(default=False)
	machine_port = models.CharField(max_length=40, blank=True, default="")
	machine_baud_rate = models.PositiveIntegerField(choices=MACHINE_BAUD_CHOICES, default=9600)
	machine_parity = models.CharField(max_length=10, choices=MACHINE_PARITY_CHOICES, default="NONE")
	machine_data_bits = models.PositiveSmallIntegerField(default=8)
	machine_stop_bits = models.PositiveSmallIntegerField(default=1)
	machine_read_timeout_ms = models.PositiveIntegerField(default=1500)
	machine_stable_read_count = models.PositiveSmallIntegerField(default=3)
	allow_manual_weight_entry = models.BooleanField(default=True)

	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		verbose_name = "System Settings"
		verbose_name_plural = "System Settings"

	def save(self, *args, **kwargs):
		self.pk = 1
		super().save(*args, **kwargs)

	@classmethod
	def get_solo(cls):
		obj, _ = cls.objects.get_or_create(pk=1)
		return obj

	def __str__(self):
		return "System Settings"
