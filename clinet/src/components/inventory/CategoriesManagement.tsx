import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import {
  getAllCategoriesAPI,
  addCategoryAPI,
  updateCategoryAPI,
  deleteCategoryAPI,
} from "@/services2/operations/category";
import { useDispatch } from "react-redux";

function CategoriesManagement({ onclose, isopen }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const dispatch = useDispatch();

  // ✅ Load categories
  const loadCategories = async () => {
    setLoading(true);
    try {
    const res = await dispatch(getAllCategoriesAPI());
      console.log(res)
      if (res) {
        setCategories(res || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isopen) loadCategories();
  }, [isopen]);

  // ✅ Open Add/Edit Form
  const handleAddNew = () => {
    setEditData(null);
    setCategoryName("");
    setOpenForm(true);
  };

  const handleEdit = (cat) => {
    setEditData(cat);
    setCategoryName(cat.categoryName);
    setOpenForm(true);
  };

  // ✅ Save category (Add or Update)
  const handleSave = async () => {
    if (!categoryName.trim()) {
      Swal.fire("Error", "Category name cannot be empty", "error");
      return;
    }

    try {
      let res;
      if (editData) {
        res = await updateCategoryAPI(editData._id, { categoryName });
      } else {
        res = await addCategoryAPI({ categoryName });
      }

      if (res?.success) {
        // Swal.fire("Success", editData ? "Category updated" : "Category added", "success");
        setOpenForm(false);
        loadCategories();
      } else {
        console.log(res)
        // Swal.fire("Error", res?.message || "Something went wrong", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Failed to save category", "error");
    }
  };

  // ✅ Delete category
  const handleDelete = async (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This category will be deleted permanently!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await deleteCategoryAPI(id);
          if (res?.success) {
            Swal.fire("Deleted!", "Category has been deleted.", "success");
            loadCategories();
          } else {
            Swal.fire("Error", res?.message || "Failed to delete", "error");
          }
        } catch (error) {
          Swal.fire("Error", "Failed to delete category", "error");
        }
      }
    });
  };

  return (
    <Dialog open={isopen} onOpenChange={onclose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium">All Categories</h2>
          <Button onClick={handleAddNew}>+ Add New</Button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="border rounded-md">
            {categories.length === 0 ? (
              <p className="p-4 text-center text-gray-500">No categories found</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border-b">#</th>
                    <th className="p-2 border-b">Category Name</th>
                    <th className="p-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, index) => (
                    <tr key={cat._id}>
                      <td className="p-2 border-b">{index + 1}</td>
                      <td className="p-2 border-b">{cat.categoryName}</td>
                      {/* <td className="p-2 border-b space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(cat)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(cat._id)}
                        >
                          Delete
                        </Button>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ✅ Add/Edit Dialog */}
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editData ? "Edit Category" : "Add New Category"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Category Name</span>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 mt-1"
                  placeholder="Enter category name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </label>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setOpenForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>{editData ? "Update" : "Add"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default CategoriesManagement;
