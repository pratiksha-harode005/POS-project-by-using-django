from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0004_goodsreceipt_delivery_location_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='purchaseorder',
            name='status',
            field=models.CharField(choices=[('Draft', 'Draft'), ('Issued', 'Issued'), ('Confirmed', 'Confirmed'), ('Processing', 'Processing'), ('Shipped', 'Shipped'), ('Delivered', 'Delivered'), ('Cancelled', 'Cancelled')], db_index=True, default='Issued', max_length=20),
        ),
    ]