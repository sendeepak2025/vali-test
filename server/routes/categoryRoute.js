const express = require("express");
const { createCategoryCtrl, getAllCategoriesCtrl, deleteCategoryCtrl, updateCategoryCtrl } = require("../controllers/categoryCrtl");
const router = express.Router();

router.post("/create", createCategoryCtrl)
router.get("/getAll", getAllCategoriesCtrl)
router.delete("/delete/:id", deleteCategoryCtrl)
router.put("/update/:id", updateCategoryCtrl)



module.exports = router
