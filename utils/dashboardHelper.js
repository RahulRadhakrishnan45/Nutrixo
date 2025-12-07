const Order = require("../models/orderSchema");
const User = require("../models/userSchema");

async function buildDashboardResponse(startDate) {

    const salesAgg = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate },
                "items.status": { $nin: ["CANCELLED", "RETURNED"] }
            }
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const totalSales = salesAgg[0]?.total || 0;
    const customers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();

    const topProducts = await Order.aggregate([
        { $unwind: "$items" },
        {
            $match: {
                createdAt: { $gte: startDate },
                "items.status": { $nin: ["CANCELLED", "RETURNED"] }
            }
        },
        { $group: { _id: "$items.product", totalQty: { $sum: "$items.quantity" } } },
        { $sort: { totalQty: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $project: {
                title: "$product.title",
                image: { $arrayElemAt: ["$product.variants.images", 0] },
                totalQty: 1
            }
        }
    ]);

    const topCategories = await Order.aggregate([
        { $unwind: "$items" },
        {
            $match: {
                createdAt: { $gte: startDate },
                "items.status": { $nin: ["CANCELLED", "RETURNED"] }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        { $group: { _id: "$product.category_id", totalQty: { $sum: "$items.quantity" } } },
        { $sort: { totalQty: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: "$category" },
        { $project: { name: "$category.name", totalQty: 1 } }
    ]);

    const topBrands = await Order.aggregate([
        { $unwind: "$items" },
        {
            $match: {
                createdAt: { $gte: startDate },
                "items.status": { $nin: ["CANCELLED", "RETURNED"] }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        { $group: { _id: "$product.brand_id", totalQty: { $sum: "$items.quantity" } } },
        { $sort: { totalQty: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "brands",
                localField: "_id",
                foreignField: "_id",
                as: "brand"
            }
        },
        { $unwind: "$brand" },
        { $project: { name: "$brand.name", totalQty: 1 } }
    ]);

    const recentOrders = await Order.find({})
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    return {
        totalSales,
        customers,
        totalOrders,
        topProducts,
        topCategories,
        topBrands,
        recentOrders
    };
}

module.exports = { buildDashboardResponse };
