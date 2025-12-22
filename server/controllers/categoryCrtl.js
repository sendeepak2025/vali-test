const categoryModel = require("../models/categoryModel");

// 📌 Create a new category
const createCategoryCtrl = async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName || categoryName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    // Check if category already exists
    const existing = await categoryModel.findOne({ categoryName: categoryName.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await categoryModel.create({
      categoryName: categoryName.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating category",
    });
  }
};

// 📌 Get all categories
const getAllCategoriesCtrl = async (req, res) => {
  try {
    const categories = await categoryModel.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching categories",
    });
  }
};

// 📌 Update a category
const updateCategoryCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    if (!categoryName || categoryName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await categoryModel.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category name already exists (excluding current one)
    const duplicate = await categoryModel.findOne({
      categoryName: categoryName.trim(),
      _id: { $ne: id },
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    category.categoryName = categoryName.trim();
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating category",
    });
  }
};

// 📌 Delete a category
const deleteCategoryCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const category = await categoryModel.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await categoryModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting category",
    });
  }
};

module.exports = {
  createCategoryCtrl,
  getAllCategoriesCtrl,
  updateCategoryCtrl,
  deleteCategoryCtrl,
};
