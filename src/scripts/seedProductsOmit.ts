/**
 * Relational seed for omit9090@gmail.com:
 * 1) Categories → 2) SubCategories → 3) Brands → 4) Products (linked)
 *
 * Usage (from server/):
 *   npx ts-node --transpile-only src/scripts/seedProductsOmit.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

import { User } from "../app/User/user.model";
import { Unit } from "../app/Unit/unit.model";
import { Category } from "../app/Category/category.model";
import { SubCategory } from "../app/SubCategory/subCategory.model";
import { Brand } from "../app/Brand/brand.model";
import { Product } from "../app/Product/product.model";

const EMAIL = "omit9090@gmail.com";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* -------------------------------------------------------------------------- */
/* Catalog definitions                                                        */
/* -------------------------------------------------------------------------- */

const CATEGORIES = [
  {
    name: "Electronics",
    description: "Gadgets, accessories, and digital devices",
    imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
  },
  {
    name: "Home & Kitchen",
    description: "Appliances and household essentials",
    imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80",
  },
  {
    name: "Grocery",
    description: "Food, beverages, and daily consumables",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
  },
  {
    name: "Sports & Fitness",
    description: "Exercise gear and outdoor sports",
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
  },
  {
    name: "Stationery",
    description: "Office and school supplies",
    imageUrl: "https://images.unsplash.com/photo-1452860606245-08bdd5c78cdc?w=800&q=80",
  },
  {
    name: "Fashion",
    description: "Apparel accessories and lifestyle",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
  },
  {
    name: "Beauty & Care",
    description: "Personal care and beauty products",
    imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
  },
] as const;

type CatName = (typeof CATEGORIES)[number]["name"];

const SUBCATEGORIES: Array<{
  category: CatName;
  name: string;
  code: string;
  imageUrl: string;
}> = [
  {
    category: "Electronics",
    name: "Audio",
    code: "ELEC-AUD",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
  },
  {
    category: "Electronics",
    name: "Mobile Accessories",
    code: "ELEC-MOB",
    imageUrl: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80",
  },
  {
    category: "Electronics",
    name: "Computing",
    code: "ELEC-COM",
    imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600&q=80",
  },
  {
    category: "Electronics",
    name: "Wearables",
    code: "ELEC-WEAR",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
  },
  {
    category: "Home & Kitchen",
    name: "Appliances",
    code: "HOME-APP",
    imageUrl: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80",
  },
  {
    category: "Home & Kitchen",
    name: "Cookware",
    code: "HOME-COOK",
    imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80",
  },
  {
    category: "Home & Kitchen",
    name: "Decor",
    code: "HOME-DEC",
    imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
  },
  {
    category: "Grocery",
    name: "Staples",
    code: "GROC-STAP",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  },
  {
    category: "Grocery",
    name: "Beverages",
    code: "GROC-BEV",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80",
  },
  {
    category: "Sports & Fitness",
    name: "Training",
    code: "SPRT-TRN",
    imageUrl: "https://images.unsplash.com/photo-1576678927484-cc907957058e?w=600&q=80",
  },
  {
    category: "Sports & Fitness",
    name: "Footwear",
    code: "SPRT-FOOT",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  },
  {
    category: "Stationery",
    name: "Writing",
    code: "STAT-WRT",
    imageUrl: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=600&q=80",
  },
  {
    category: "Stationery",
    name: "Paper Goods",
    code: "STAT-PAP",
    imageUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=80",
  },
  {
    category: "Fashion",
    name: "Accessories",
    code: "FASH-ACC",
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80",
  },
  {
    category: "Fashion",
    name: "Bags",
    code: "FASH-BAG",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
  },
  {
    category: "Beauty & Care",
    name: "Skin Care",
    code: "BEAU-SKIN",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80",
  },
  {
    category: "Beauty & Care",
    name: "Hair & Oral",
    code: "BEAU-HAIR",
    imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80",
  },
];

const BRANDS = [
  {
    name: "SoundWave",
    imageUrl: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=200&q=80",
  },
  {
    name: "PowerMax",
    imageUrl: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=200&q=80",
  },
  {
    name: "ClickTech",
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&q=80",
  },
  {
    name: "PulseWear",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80",
  },
  {
    name: "CablePro",
    imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=200&q=80",
  },
  {
    name: "HomeBright",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&q=80",
  },
  {
    name: "KitchenAid BD",
    imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=200&q=80",
  },
  {
    name: "FreshFarm",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80",
  },
  {
    name: "FitGear",
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&q=80",
  },
  {
    name: "WriteWell",
    imageUrl: "https://images.unsplash.com/photo-1452860606245-08bdd5c78cdc?w=200&q=80",
  },
  {
    name: "UrbanStyle",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80",
  },
  {
    name: "GlowCare",
    imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80",
  },
] as const;

type BrandName = (typeof BRANDS)[number]["name"];

type SeedProduct = {
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: CatName;
  subCategory: string;
  brand: BrandName;
  description: string;
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Wireless Bluetooth Speaker Mini",
    price: 950,
    quantity: 42,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80",
    category: "Electronics",
    subCategory: "Audio",
    brand: "SoundWave",
    description: "Portable Bluetooth speaker with rich bass and 8-hour battery.",
  },
  {
    name: "Noise Cancelling Headphones",
    price: 4500,
    quantity: 20,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    category: "Electronics",
    subCategory: "Audio",
    brand: "SoundWave",
    description: "Over-ear ANC headphones for travel and focus work.",
  },
  {
    name: "Wireless Earbuds Pro",
    price: 2100,
    quantity: 48,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    category: "Electronics",
    subCategory: "Audio",
    brand: "SoundWave",
    description: "True wireless earbuds with charging case and touch controls.",
  },
  {
    name: "Portable Power Bank 20000mAh",
    price: 1850,
    quantity: 55,
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80",
    category: "Electronics",
    subCategory: "Mobile Accessories",
    brand: "PowerMax",
    description: "Fast-charge dual-port power bank for phones and tablets.",
  },
  {
    name: "USB-C Fast Charging Cable 1m",
    price: 180,
    quantity: 120,
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80",
    category: "Electronics",
    subCategory: "Mobile Accessories",
    brand: "CablePro",
    description: "Braided USB-C cable supporting fast charging protocols.",
  },
  {
    name: "Phone Tripod Stand Flexible",
    price: 650,
    quantity: 60,
    image: "https://images.unsplash.com/photo-1475724017904-b712052c192a?w=600&q=80",
    category: "Electronics",
    subCategory: "Mobile Accessories",
    brand: "ClickTech",
    description: "Flexible octopus tripod for smartphones and action cams.",
  },
  {
    name: "Bluetooth Car Adapter FM",
    price: 980,
    quantity: 36,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80",
    category: "Electronics",
    subCategory: "Mobile Accessories",
    brand: "PowerMax",
    description: "FM transmitter with Bluetooth hands-free calling.",
  },
  {
    name: "Wireless Optical Mouse",
    price: 420,
    quantity: 80,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80",
    category: "Electronics",
    subCategory: "Computing",
    brand: "ClickTech",
    description: "Ergonomic 2.4GHz wireless mouse with silent clicks.",
  },
  {
    name: "Mechanical Keyboard RGB",
    price: 3200,
    quantity: 25,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600&q=80",
    category: "Electronics",
    subCategory: "Computing",
    brand: "ClickTech",
    description: "RGB backlit mechanical keyboard with blue switches.",
  },
  {
    name: "Webcam HD 1080p Clip-On",
    price: 2450,
    quantity: 20,
    image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600&q=80",
    category: "Electronics",
    subCategory: "Computing",
    brand: "ClickTech",
    description: "Full HD webcam with built-in mic for meetings.",
  },
  {
    name: "Laptop Sleeve 15.6 Inch",
    price: 890,
    quantity: 42,
    image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=600&q=80",
    category: "Electronics",
    subCategory: "Computing",
    brand: "UrbanStyle",
    description: "Padded neoprene sleeve for 15–15.6 inch laptops.",
  },
  {
    name: "USB Hub 4-Port 3.0",
    price: 650,
    quantity: 58,
    image: "https://images.unsplash.com/photo-1614624532983-4ce03382d20a?w=600&q=80",
    category: "Electronics",
    subCategory: "Computing",
    brand: "CablePro",
    description: "Compact USB 3.0 hub with 4 high-speed ports.",
  },
  {
    name: "HDMI Cable 2m Gold Plated",
    price: 350,
    quantity: 90,
    image: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=600&q=80",
    category: "Electronics",
    subCategory: "Computing",
    brand: "CablePro",
    description: "4K-ready HDMI cable with gold-plated connectors.",
  },
  {
    name: "Extension Cord 5m 4-Socket",
    price: 620,
    quantity: 72,
    image: "https://images.unsplash.com/photo-1544724569-5f373012eaed?w=600&q=80",
    category: "Electronics",
    subCategory: "Computing",
    brand: "PowerMax",
    description: "Heavy-duty 5 meter extension with 4 sockets and switch.",
  },
  {
    name: "Smart Watch Series Lite",
    price: 1850,
    quantity: 28,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    category: "Electronics",
    subCategory: "Wearables",
    brand: "PulseWear",
    description: "Fitness smartwatch with heart-rate and sleep tracking.",
  },
  {
    name: "Analog Wrist Watch Classic",
    price: 2800,
    quantity: 22,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80",
    category: "Fashion",
    subCategory: "Accessories",
    brand: "UrbanStyle",
    description: "Classic analog watch with leather strap.",
  },
  {
    name: "LED Desk Lamp Adjustable",
    price: 1250,
    quantity: 35,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Decor",
    brand: "HomeBright",
    description: "Touch-dimmable LED desk lamp with USB port.",
  },
  {
    name: "Wall Clock Silent Quartz",
    price: 750,
    quantity: 34,
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Decor",
    brand: "HomeBright",
    description: "Silent non-ticking wall clock for offices and homes.",
  },
  {
    name: "Plant Pot Ceramic Medium",
    price: 480,
    quantity: 50,
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Decor",
    brand: "HomeBright",
    description: "Glazed ceramic plant pot with drainage hole.",
  },
  {
    name: "Scented Candle Vanilla Jar",
    price: 550,
    quantity: 66,
    image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Decor",
    brand: "GlowCare",
    description: "Long-burn vanilla scented soy candle in glass jar.",
  },
  {
    name: "Electric Kettle 1.7L",
    price: 1450,
    quantity: 40,
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Appliances",
    brand: "KitchenAid BD",
    description: "Stainless steel electric kettle with auto shut-off.",
  },
  {
    name: "Rice Cooker 1.8L Non-Stick",
    price: 2450,
    quantity: 18,
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Appliances",
    brand: "KitchenAid BD",
    description: "Family-size rice cooker with keep-warm function.",
  },
  {
    name: "Table Fan 16 Inch",
    price: 2200,
    quantity: 22,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Appliances",
    brand: "HomeBright",
    description: "Oscillating 16-inch table fan with 3 speeds.",
  },
  {
    name: "Non-Stick Frying Pan 28cm",
    price: 1350,
    quantity: 32,
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Cookware",
    brand: "KitchenAid BD",
    description: "PFOA-free non-stick frying pan, induction compatible.",
  },
  {
    name: "Ceramic Coffee Mug Set (4pcs)",
    price: 980,
    quantity: 45,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Cookware",
    brand: "HomeBright",
    description: "Set of 4 microwave-safe ceramic mugs.",
  },
  {
    name: "Stainless Steel Water Bottle 750ml",
    price: 890,
    quantity: 70,
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Cookware",
    brand: "FitGear",
    description: "Insulated stainless bottle keeps drinks cold/hot.",
  },
  {
    name: "Cotton Bath Towel Large",
    price: 550,
    quantity: 85,
    image: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=600&q=80",
    category: "Home & Kitchen",
    subCategory: "Decor",
    brand: "HomeBright",
    description: "Soft absorbent cotton bath towel, large size.",
  },
  {
    name: "Premium Basmati Rice 5kg",
    price: 780,
    quantity: 100,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
    category: "Grocery",
    subCategory: "Staples",
    brand: "FreshFarm",
    description: "Aged long-grain basmati rice, 5kg pack.",
  },
  {
    name: "Sunflower Cooking Oil 2L",
    price: 520,
    quantity: 75,
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
    category: "Grocery",
    subCategory: "Staples",
    brand: "FreshFarm",
    description: "Refined sunflower oil for everyday cooking.",
  },
  {
    name: "Honey Pure Natural 500g",
    price: 650,
    quantity: 55,
    image: "https://images.unsplash.com/photo-1587049352846-4a7b264b2a55?w=600&q=80",
    category: "Grocery",
    subCategory: "Staples",
    brand: "FreshFarm",
    description: "Raw natural honey in sealed glass jar.",
  },
  {
    name: "Whole Wheat Bread Loaf",
    price: 80,
    quantity: 40,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
    category: "Grocery",
    subCategory: "Staples",
    brand: "FreshFarm",
    description: "Fresh whole wheat sandwich loaf.",
  },
  {
    name: "Organic Green Tea Pack 100g",
    price: 380,
    quantity: 90,
    image: "https://images.unsplash.com/photo-1564890369479-c4ba43b0d0b2?w=600&q=80",
    category: "Grocery",
    subCategory: "Beverages",
    brand: "FreshFarm",
    description: "Loose-leaf organic green tea, antioxidant rich.",
  },
  {
    name: "Instant Coffee Jar 200g",
    price: 720,
    quantity: 60,
    image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80",
    category: "Grocery",
    subCategory: "Beverages",
    brand: "FreshFarm",
    description: "Smooth instant coffee granules, 200g jar.",
  },
  {
    name: "Yoga Mat Extra Thick",
    price: 1200,
    quantity: 38,
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&q=80",
    category: "Sports & Fitness",
    subCategory: "Training",
    brand: "FitGear",
    description: "Non-slip extra-thick yoga mat with carry strap.",
  },
  {
    name: "Dumbbell Set 5kg Pair",
    price: 1800,
    quantity: 24,
    image: "https://images.unsplash.com/photo-1576678927484-cc907957058e?w=600&q=80",
    category: "Sports & Fitness",
    subCategory: "Training",
    brand: "FitGear",
    description: "Pair of 5kg rubber-coated dumbbells.",
  },
  {
    name: "Sports Water Bottle Shaker",
    price: 450,
    quantity: 95,
    image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&q=80",
    category: "Sports & Fitness",
    subCategory: "Training",
    brand: "FitGear",
    description: "Protein shaker bottle with mixing ball.",
  },
  {
    name: "Running Shoes Lightweight",
    price: 3200,
    quantity: 30,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    category: "Sports & Fitness",
    subCategory: "Footwear",
    brand: "FitGear",
    description: "Breathable lightweight running shoes for daily training.",
  },
  {
    name: "Notebook A5 Hardcover Lined",
    price: 220,
    quantity: 150,
    image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=80",
    category: "Stationery",
    subCategory: "Paper Goods",
    brand: "WriteWell",
    description: "A5 hardcover ruled notebook, 120 pages.",
  },
  {
    name: "Sticky Notes Assorted Colors",
    price: 120,
    quantity: 180,
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80",
    category: "Stationery",
    subCategory: "Paper Goods",
    brand: "WriteWell",
    description: "Assorted sticky note pads for desk organization.",
  },
  {
    name: "Ballpoint Pen Pack (12pcs)",
    price: 150,
    quantity: 200,
    image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=600&q=80",
    category: "Stationery",
    subCategory: "Writing",
    brand: "WriteWell",
    description: "Smooth ballpoint pens, pack of 12 blue ink.",
  },
  {
    name: "Highlighter Marker Set (6pcs)",
    price: 280,
    quantity: 110,
    image: "https://images.unsplash.com/photo-1452860606245-12b2cbfe47d0?w=600&q=80",
    category: "Stationery",
    subCategory: "Writing",
    brand: "WriteWell",
    description: "Chisel-tip highlighters in 6 bright colors.",
  },
  {
    name: "Leather Wallet Bifold",
    price: 1650,
    quantity: 40,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80",
    category: "Fashion",
    subCategory: "Accessories",
    brand: "UrbanStyle",
    description: "Genuine leather bifold wallet with card slots.",
  },
  {
    name: "Classic Sunglasses UV400",
    price: 890,
    quantity: 50,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80",
    category: "Fashion",
    subCategory: "Accessories",
    brand: "UrbanStyle",
    description: "UV400 polarized classic sunglasses.",
  },
  {
    name: "Umbrella Compact Foldable",
    price: 380,
    quantity: 88,
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
    category: "Fashion",
    subCategory: "Accessories",
    brand: "UrbanStyle",
    description: "Wind-resistant compact foldable umbrella.",
  },
  {
    name: "Canvas Tote Bag Everyday",
    price: 750,
    quantity: 65,
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80",
    category: "Fashion",
    subCategory: "Bags",
    brand: "UrbanStyle",
    description: "Durable canvas tote for shopping and everyday carry.",
  },
  {
    name: "Kids Backpack School Everyday",
    price: 1450,
    quantity: 40,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
    category: "Fashion",
    subCategory: "Bags",
    brand: "UrbanStyle",
    description: "Lightweight school backpack with multiple compartments.",
  },
  {
    name: "Face Moisturizer Cream 50ml",
    price: 1100,
    quantity: 45,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80",
    category: "Beauty & Care",
    subCategory: "Skin Care",
    brand: "GlowCare",
    description: "Daily hydrating face cream for all skin types.",
  },
  {
    name: "Hand Sanitizer Gel 500ml",
    price: 250,
    quantity: 130,
    image: "https://images.unsplash.com/photo-1584744982493-95907dea8501?w=600&q=80",
    category: "Beauty & Care",
    subCategory: "Skin Care",
    brand: "GlowCare",
    description: "Alcohol-based hand sanitizer gel, 500ml pump.",
  },
  {
    name: "Shampoo Herbal 400ml",
    price: 420,
    quantity: 70,
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80",
    category: "Beauty & Care",
    subCategory: "Hair & Oral",
    brand: "GlowCare",
    description: "Herbal shampoo for soft, healthy hair.",
  },
  {
    name: "Toothbrush Soft Bristle (3pcs)",
    price: 180,
    quantity: 140,
    image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&q=80",
    category: "Beauty & Care",
    subCategory: "Hair & Oral",
    brand: "GlowCare",
    description: "Soft-bristle toothbrushes, family pack of 3.",
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function ensureUnit(tenantId: string, userId: mongoose.Types.ObjectId) {
  let unit = await Unit.findOne({ tenantId, shortName: "Pc" });
  if (!unit) {
    unit = await Unit.create({
      tenantId,
      name: "Piece",
      shortName: "Pc",
      status: "active",
      createdBy: userId,
    });
    console.log("Created unit Piece/Pc");
  } else {
    console.log(`Using unit: ${unit.name} (${unit.shortName})`);
  }
  return unit;
}

async function seedCategories(
  tenantId: string,
  userId: mongoose.Types.ObjectId
) {
  const map = new Map<string, mongoose.Types.ObjectId>();
  for (const c of CATEGORIES) {
    const slug = slugify(c.name);
    let doc = await Category.findOne({ tenantId, slug });
    if (!doc) {
      doc = await Category.create({
        tenantId,
        name: c.name,
        slug,
        description: c.description,
        imageUrl: c.imageUrl,
        status: "active",
        createdBy: userId,
      });
      console.log(`  + category: ${c.name}`);
    } else {
      await Category.updateOne(
        { _id: doc._id },
        {
          $set: {
            description: c.description,
            imageUrl: c.imageUrl,
            status: "active",
            updatedBy: userId,
          },
        }
      );
      console.log(`  ~ category: ${c.name}`);
    }
    map.set(c.name, doc._id as mongoose.Types.ObjectId);
  }
  return map;
}

async function seedSubCategories(
  tenantId: string,
  userId: mongoose.Types.ObjectId,
  categoryMap: Map<string, mongoose.Types.ObjectId>
) {
  const map = new Map<string, mongoose.Types.ObjectId>(); // key: category|subName
  for (const s of SUBCATEGORIES) {
    const categoryId = categoryMap.get(s.category);
    if (!categoryId) throw new Error(`Missing category ${s.category}`);
    const slug = slugify(s.name);
    let doc = await SubCategory.findOne({ tenantId, categoryId, slug });
    if (!doc) {
      doc = await SubCategory.findOne({ tenantId, code: s.code });
    }
    if (!doc) {
      doc = await SubCategory.create({
        tenantId,
        categoryId,
        subCategoryName: s.name,
        slug,
        code: s.code,
        description: `${s.name} under ${s.category}`,
        imageUrl: s.imageUrl,
        status: "active",
        createdBy: userId,
      });
      console.log(`  + subcategory: ${s.category} → ${s.name}`);
    } else {
      await SubCategory.updateOne(
        { _id: doc._id },
        {
          $set: {
            categoryId,
            subCategoryName: s.name,
            slug,
            description: `${s.name} under ${s.category}`,
            imageUrl: s.imageUrl,
            status: "active",
            updatedBy: userId,
          },
        }
      );
      console.log(`  ~ subcategory: ${s.category} → ${s.name}`);
    }
    map.set(`${s.category}|${s.name}`, doc._id as mongoose.Types.ObjectId);
  }
  return map;
}

async function seedBrands(tenantId: string, userId: mongoose.Types.ObjectId) {
  const map = new Map<string, mongoose.Types.ObjectId>();
  for (const b of BRANDS) {
    const slug = slugify(b.name);
    let doc = await Brand.findOne({ tenantId, slug });
    if (!doc) {
      doc = await Brand.create({
        tenantId,
        name: b.name,
        slug,
        imageUrl: b.imageUrl,
        status: "active",
        createdBy: userId,
      });
      console.log(`  + brand: ${b.name}`);
    } else {
      await Brand.updateOne(
        { _id: doc._id },
        {
          $set: {
            imageUrl: b.imageUrl,
            status: "active",
            updatedBy: userId,
          },
        }
      );
      console.log(`  ~ brand: ${b.name}`);
    }
    map.set(b.name, doc._id as mongoose.Types.ObjectId);
  }
  return map;
}

async function seedProducts(
  tenantId: string,
  userId: mongoose.Types.ObjectId,
  unitId: mongoose.Types.ObjectId,
  categoryMap: Map<string, mongoose.Types.ObjectId>,
  subMap: Map<string, mongoose.Types.ObjectId>,
  brandMap: Map<string, mongoose.Types.ObjectId>
) {
  if (PRODUCTS.length !== 50) {
    throw new Error(`Expected 50 products, got ${PRODUCTS.length}`);
  }

  const stamp = Date.now().toString().slice(-6);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const categoryId = categoryMap.get(p.category);
    const subCategoryId = subMap.get(`${p.category}|${p.subCategory}`);
    const brandId = brandMap.get(p.brand);

    if (!categoryId || !subCategoryId || !brandId) {
      skipped++;
      console.warn(
        `skip ${p.name}: missing relation (cat=${!!categoryId} sub=${!!subCategoryId} brand=${!!brandId})`
      );
      continue;
    }

    const baseSlug = slugify(p.name);
    const sku = `REL-${stamp}-${String(i + 1).padStart(3, "0")}`;

    const payload = {
      tenantId,
      name: p.name,
      slug: `${baseSlug}-rel`,
      sku,
      sellingType: "single" as const,
      categoryId,
      subCategoryId,
      brandId,
      unitId,
      quantity: p.quantity,
      lowStockThreshold: 10,
      price: p.price,
      images: [p.image],
      description: p.description,
      manufacturer: p.brand,
      status: "active" as const,
      barcodeSymbology: "CODE128" as const,
      itemBarcode: sku,
      taxType: "VAT",
    };

    // Prefer update if same name already exists for tenant
    const existing = await Product.findOne({ tenantId, name: p.name });
    if (existing) {
      try {
        await Product.updateOne(
          { _id: existing._id },
          {
            $set: {
              categoryId,
              subCategoryId,
              brandId,
              unitId,
              quantity: p.quantity,
              price: p.price,
              images: [p.image],
              description: p.description,
              manufacturer: p.brand,
              status: "active",
              updatedBy: userId,
            },
          }
        );
        updated++;
        console.log(`  ~ product: ${p.name}`);
      } catch (err: any) {
        skipped++;
        console.warn(`skip update ${p.name}: ${err?.message || err}`);
      }
      continue;
    }

    try {
      await Product.create({
        ...payload,
        createdBy: userId,
      });
      created++;
      console.log(`  + product: ${p.name}`);
    } catch (err: any) {
      // slug conflict — retry with stamp
      try {
        await Product.create({
          ...payload,
          slug: `${baseSlug}-${stamp}-${i + 1}`,
          sku: `${sku}-X`,
          itemBarcode: `${sku}-X`,
          createdBy: userId,
        });
        created++;
        console.log(`  + product: ${p.name} (alt sku)`);
      } catch (err2: any) {
        skipped++;
        console.warn(`skip ${p.name}: ${err2?.message || err2}`);
      }
    }
  }

  return { created, updated, skipped };
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL missing");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\n");

  const user = await User.findOne({ email: EMAIL });
  if (!user) throw new Error(`User not found: ${EMAIL}`);
  const tenantId = user.tenantId;
  if (!tenantId) throw new Error(`User ${EMAIL} has no tenantId`);
  const userId = user._id as mongoose.Types.ObjectId;
  console.log(`Target: ${EMAIL} → tenantId=${tenantId}\n`);

  const unit = await ensureUnit(tenantId, userId);

  console.log("\n[1/4] Seeding categories…");
  const categoryMap = await seedCategories(tenantId, userId);

  console.log("\n[2/4] Seeding subcategories…");
  const subMap = await seedSubCategories(tenantId, userId, categoryMap);

  console.log("\n[3/4] Seeding brands…");
  const brandMap = await seedBrands(tenantId, userId);

  console.log("\n[4/4] Seeding products with relations…");
  const result = await seedProducts(
    tenantId,
    userId,
    unit._id as mongoose.Types.ObjectId,
    categoryMap,
    subMap,
    brandMap
  );

  console.log("\n========== Summary ==========");
  console.log(`Categories:     ${categoryMap.size}`);
  console.log(`Subcategories:  ${subMap.size}`);
  console.log(`Brands:         ${brandMap.size}`);
  console.log(
    `Products:       created=${result.created}, updated=${result.updated}, skipped=${result.skipped}`
  );
  console.log("=============================\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
