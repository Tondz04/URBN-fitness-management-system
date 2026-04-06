import * as React from "react";
import { Modal } from "../components/Modal";
import { useTheme } from "../contexts/ThemeContext";
import { useNotification } from "../contexts/NotificationContext";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { useAuth } from "../contexts/AuthContext";
import { SearchableSelect } from "../components/SearchableSelect";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  cost?: number; // Cost field (MAIN_ADMIN only)
  stock: number;
  image: string;
  category: string;
  is_active: boolean;
}

export default function Products() {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const isMainAdmin = user?.role === "main_admin";
  const isDark = theme === "dark";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6"; // Light gray for cards
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db"; // Darker border
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

  const [items, setItems] = React.useState<Product[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(
    null
  );
  const [deletingProduct, setDeletingProduct] = React.useState<number | null>(
    null
  );
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    price: "",
    cost: "", // Cost field
    stock: "",
    category: "supplements",
    is_active: true,
  });
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(
    null
  );

  // Products are already filtered by backend
  const filteredProducts = items || [];

  // Helper function to get the correct image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "";

    // If it's a data URL, return as is
    if (imagePath.startsWith("data:")) {
      return imagePath;
    }

    // If it's already a full URL (external), return as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // If it's a local path, prepend the API base URL
    if (imagePath.startsWith("/")) {
      return `http://127.0.0.1:8000${imagePath}`;
    }

    // Default fallback
    return imagePath;
  };

  // Fetch products function
  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = searchTerm
        ? `/api/products?search=${encodeURIComponent(searchTerm)}`
        : "/api/products";

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setItems(data.data);
      setError(null);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to fetch products:", err);
        setError(err.message || "Failed to load products");
        setItems(null);
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Initial load
  React.useEffect(() => {
    fetchProducts();
  }, []); // Only on mount

  // Debounce search to prevent page refreshes
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 800); // Increased debounce time to prevent refreshes

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchTerm, fetchProducts]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      cost: "",
      stock: "",
      category: "supplements",
      is_active: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";

      if (editingProduct) {
        // For editing, handle both file uploads and string values
        if (imageFile) {
          // If there's a new image file, use FormData
          const formDataToSend = new FormData();
          formDataToSend.append("name", formData.name);
          formDataToSend.append("description", formData.description);
          formDataToSend.append("price", formData.price);
          if (isMainAdmin && formData.cost) {
            formDataToSend.append("cost", formData.cost);
          }
          formDataToSend.append("stock", formData.stock);
          formDataToSend.append("category", formData.category);
          formDataToSend.append("is_active", formData.is_active.toString());
          formDataToSend.append("image", imageFile);
          formDataToSend.append("_method", "PUT");

          const response = await fetch(url, {
            method: "POST",
            body: formDataToSend,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
          }

          const result = await response.json();
          console.log("Product updated with new image:", result);
        } else {
          // If no new image file, use JSON format with current image
          const requestData: any = {
            name: formData.name,
            description: formData.description,
            price: formData.price,
            stock: formData.stock,
            category: formData.category,
            is_active: formData.is_active,
            image: editingProduct.image, // Keep the current image
          };
          if (isMainAdmin && formData.cost) {
            requestData.cost = formData.cost;
          }

          const response = await fetch(url, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
          }

          const result = await response.json();
          console.log("Product updated:", result);
        }
      } else {
        // For creating new product, use FormData
        const formDataToSend = new FormData();
        formDataToSend.append("name", formData.name);
        formDataToSend.append("description", formData.description);
        formDataToSend.append("price", formData.price);
        if (isMainAdmin && formData.cost) {
          formDataToSend.append("cost", formData.cost);
        }
        formDataToSend.append("stock", formData.stock);
        formDataToSend.append("category", formData.category);
        formDataToSend.append("is_active", formData.is_active.toString());

        if (imageFile) {
          formDataToSend.append("image", imageFile);
        }

        const response = await fetch(url, {
          method: "POST",
          body: formDataToSend,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log("Product created:", result);
      }

      resetForm();
      fetchProducts();
      showSuccess(
        editingProduct
          ? "Item updated successfully!"
          : "Item created successfully!"
      );
    } catch (err) {
      console.error("Error saving product:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save item";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      stock: product.stock.toString(),
      category: product.category,
      is_active: product.is_active,
    });
    setImageFile(null);
    setImagePreview(product.image);
    setShowEditForm(true);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleExportCSV = () => {
    if (!items || items.length === 0) {
      showError("No inventory items to export");
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Price",
      "Cost",
      "Stock",
      "Category",
      "SKU",
      "Status",
    ];
    const rows = items.map((item) => [
      item.id,
      item.name,
      item.price,
      item.cost || "",
      item.stock,
      item.category,
      item.id, // Using ID as SKU
      item.is_active ? "Active" : "Inactive",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inventory_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Inventory exported successfully!");
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        showError("CSV file is empty or invalid");
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const dataRows = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;
      const errorDetails: string[] = [];

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        const rowNumber = rowIndex + 2; // +2 because row 1 is header, and we're 0-indexed
        const values = row.split(",").map((v) => v.trim().replace(/"/g, ""));
        
        if (values.length !== headers.length) {
          errorCount++;
          errorDetails.push(`Row ${rowNumber}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header.toLowerCase().replace(/\s+/g, "_")] = values[index];
        });

        try {
          const productData: any = {
            name: rowData.name || rowData["product name"],
            price: parseFloat(rowData.price || 0),
            stock: parseInt(rowData.stock || rowData.quantity || 0),
            category: rowData.category || "other",
            description: rowData.description || "",
            is_active: (rowData.status || "active").toLowerCase() === "active",
          };

          if (isMainAdmin && rowData.cost) {
            productData.cost = parseFloat(rowData.cost);
          }

          const existingId = rowData.id || rowData.sku;
          
          // Validate required fields first
          if (!productData.name || productData.name.trim() === "") {
            errorCount++;
            errorDetails.push(`Row ${rowNumber}${existingId ? ` (ID: ${existingId})` : ""}: Missing product name (required)`);
            continue;
          }
          if (isNaN(productData.price) || productData.price <= 0) {
            errorCount++;
            errorDetails.push(`Row ${rowNumber}${existingId ? ` (ID: ${existingId})` : ""} (${productData.name || "Unknown"}): Invalid price (must be > 0)`);
            continue;
          }
          if (isNaN(productData.stock) || productData.stock < 0) {
            errorCount++;
            errorDetails.push(`Row ${rowNumber}${existingId ? ` (ID: ${existingId})` : ""} (${productData.name || "Unknown"}): Invalid stock (must be >= 0)`);
            continue;
          }

          // Try to find existing product by ID first, then by name
          let existingProductId: number | null = null;
          
          if (existingId) {
            // First try to find by ID
            const checkResponse = await fetch(`/api/products/${existingId}`);
            if (checkResponse.ok) {
              const responseData = await checkResponse.json();
              // Handle both { data: product } and direct product object
              const product = responseData.data || responseData;
              if (product && product.id) {
                existingProductId = product.id;
              }
            }
          }
          
          // If not found by ID, try to find by name
          if (!existingProductId && productData.name) {
            const allProductsResponse = await fetch("/api/products");
            if (allProductsResponse.ok) {
              const responseData = await allProductsResponse.json();
              // API returns { data: products }, so we need to access the data property
              const allProducts = Array.isArray(responseData.data) ? responseData.data : (Array.isArray(responseData) ? responseData : []);
              const matchedProduct = allProducts.find(
                (p: Product) => p.name.toLowerCase().trim() === productData.name.toLowerCase().trim()
              );
              if (matchedProduct) {
                existingProductId = matchedProduct.id;
              }
            }
          }
          
          if (existingProductId) {
            // Product exists, update it
            const response = await fetch(`/api/products/${existingProductId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(productData),
            });
            if (response.ok) {
              successCount++;
            } else {
              const errorData = await response.json().catch(() => ({}));
              errorCount++;
              const errorMsg = errorData.message || errorData.error || "Unknown error";
              errorDetails.push(`Row ${rowNumber} (ID: ${existingProductId}): ${errorMsg}`);
              console.error("Failed to update product:", errorData);
            }
          } else {
            // Product doesn't exist, create new one
            const response = await fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(productData),
            });
            if (response.ok) {
              successCount++;
            } else {
              const errorData = await response.json().catch(() => ({}));
              errorCount++;
              const errorMsg = errorData.message || errorData.error || "Unknown error";
              errorDetails.push(`Row ${rowNumber} (${productData.name || "Unknown"}): ${errorMsg}`);
              console.error("Failed to create product:", errorData);
            }
          }
        } catch (err: any) {
          errorCount++;
          errorDetails.push(`Row ${rowNumber}: ${err.message || "Unexpected error"}`);
        }
      }

      fetchProducts();
      
      // Show detailed error message if there are errors
      if (errorCount > 0) {
        const errorSummary = errorDetails.slice(0, 5).join("; "); // Show first 5 errors
        const moreErrors = errorDetails.length > 5 ? ` (and ${errorDetails.length - 5} more...)` : "";
        showError(
          `Import completed: ${successCount} succeeded, ${errorCount} failed. Errors: ${errorSummary}${moreErrors}. Check console for full details.`
        );
        console.error("CSV Import Errors:", errorDetails);
      } else {
        showSuccess(
          `Import completed: ${successCount} items processed successfully`
        );
      }
      e.target.value = ""; // Reset file input
    } catch (err) {
      showError("Failed to import CSV file. Please check the format.");
      e.target.value = "";
    }
  };

  const [confirmDelete, setConfirmDelete] = React.useState<{
    isOpen: boolean;
    productId: number | null;
  }>({ isOpen: false, productId: null });

  const handleDelete = async (id: number) => {
    setConfirmDelete({ isOpen: true, productId: id });
  };

  const confirmDeleteProduct = async () => {
    if (!confirmDelete.productId) return;

    setDeletingProduct(confirmDelete.productId);
    try {
      const response = await fetch(`/api/products/${confirmDelete.productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      fetchProducts();
      showSuccess("Item deleted successfully!");
    } catch (err) {
      console.error("Error deleting product:", err);
      showError(
        err instanceof Error
          ? err.message
          : "Failed to delete item. Please try again."
      );
    } finally {
      setDeletingProduct(null);
      setConfirmDelete({ isOpen: false, productId: null });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#9ca3af" }}>
          Loading inventory...
        </div>
      </div>
    );
  }

  if (error && !items) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 16 }}>
          Failed to load inventory
        </div>
        <div style={{ color: "#9ca3af", marginBottom: 20 }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#071d63",
            color: "white",
            border: 0,
            borderRadius: 8,
            padding: "12px 24px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>
          Inventory
        </h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* View Toggle */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: bgSecondary,
              padding: 4,
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
            }}
          >
            <button
              onClick={() => setViewMode("grid")}
              style={{
                background:
                  viewMode === "grid"
                    ? isDark
                      ? "#1a1a1a"
                      : "#ffffff"
                    : "transparent",
                color: textPrimary,
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
                transition: "all 0.2s ease",
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                background:
                  viewMode === "list"
                    ? isDark
                      ? "#1a1a1a"
                      : "#ffffff"
                    : "transparent",
                color: textPrimary,
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
                transition: "all 0.2s ease",
              }}
            >
              List
            </button>
          </div>

          {/* Export/Import Buttons */}
          {(isMainAdmin || user?.role === "staff") && (
            <>
              <button
                onClick={handleExportCSV}
                style={{
                  background: "transparent",
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Export CSV
              </button>
              <label
                style={{
                  background: "transparent",
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                  display: "inline-block",
                }}
              >
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  style={{ display: "none" }}
                />
              </label>
            </>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: "#057a1a",
              color: "white",
              border: 0,
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showAddForm ? "Cancel" : "Add Item"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {(showAddForm || showEditForm) && (
        <Modal
          title={editingProduct ? "Edit Item" : "Add New Item"}
          onClose={resetForm}
          maxWidth={700}
          footer={
            <>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginRight: 8,
                }}
              >
                Cancel
              </button>
              <button
                form="product-form"
                type="submit"
                style={{
                  background: "#071d63",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {editingProduct ? "Update Product" : "Create Product"}
              </button>
            </>
          }
        >
          <form
            id="product-form"
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr 1fr" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Category *
              </label>
              <SearchableSelect
                value={formData.category}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, category: value.toString() }));
                }}
                options={[
                  { value: "supplements", label: "Supplements" },
                  { value: "equipment", label: "Equipment" },
                  { value: "apparel", label: "Apparel" },
                  { value: "other", label: "Other" },
                ]}
                placeholder="Select Category"
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Price (₱) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
              />
            </div>

            {isMainAdmin && (
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: textPrimary,
                    fontWeight: 600,
                  }}
                >
                  Cost (₱) {isMainAdmin && "*"}
                </label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="Enter cost"
                  style={{
                    width: "100%",
                    maxWidth: "300px",
                    padding: "12px",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    color: textPrimary,
                    fontSize: 14,
                  }}
                />
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Stock Quantity *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                required
                min="0"
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Product Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
              />
              {imagePreview && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={imagePreview ? getImageUrl(imagePreview) : ""}
                    alt="Preview"
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #374151",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
                    }}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                style={{ margin: 0, transform: "scale(1.2)" }}
              />
              <label
                style={{ color: textPrimary, fontSize: 14, fontWeight: 500 }}
              >
                Active (visible to customers)
              </label>
            </div>
          </form>
        </Modal>
      )}

      {/* Search Section */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Search by ID, name, description, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 18px",
              background: bgSecondary,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              color: textPrimary,
              fontSize: 16,
            }}
          />
        </div>
        {searchTerm && (
          <div
            style={{
              color: "#9ca3af",
              fontSize: 14,
              whiteSpace: "nowrap",
              marginLeft: 20,
            }}
          >
            {filteredProducts.length} item
            {filteredProducts.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      {viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {filteredProducts?.map((p) => (
            <div
              key={p.id}
              style={{
                background: bgSecondary,
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                padding: 16,
                position: "relative",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onClick={() => handleViewProduct(p)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  height: 160,
                  background: bgSecondary,
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  marginBottom: 12,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <img
                  src={getImageUrl(p.image)}
                  alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
                  }}
                />
                {!p.is_active && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "#8a0707",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    INACTIVE
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    color: textPrimary,
                    fontWeight: 700,
                    fontSize: 16,
                    marginBottom: 4,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  {p.category.charAt(0).toUpperCase() + p.category.slice(1)}
                </div>
                <div
                  style={{ color: "#f59e0b", fontSize: 18, fontWeight: 700 }}
                >
                  ₱{p.price}
                </div>
                {isMainAdmin && p.cost && (
                  <div
                    style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}
                  >
                    Cost: ₱{p.cost} | Margin:{" "}
                    {(((p.price - p.cost) / p.price) * 100).toFixed(1)}%
                  </div>
                )}
                <div style={{ color: textSecondary, fontSize: 12 }}>
                  Stock: {p.stock} units
                </div>
                {p.description && (
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 12,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {p.description.length > 60
                      ? p.description.substring(0, 60) + "..."
                      : p.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: bgSecondary,
            borderRadius: 12,
            border: `1px solid ${borderColor}`,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: isDark ? "#1a1a1a" : "#e5e7eb",
                  borderBottom: `2px solid ${borderColor}`,
                }}
              >
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  Stock
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  Price
                </th>
                <th
                  style={{
                    padding: "18px 20px",
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "0.3px",
                  }}
                >
                  Category
                </th>
                <th
                  style={{
                    padding: "18px 20px",
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "0.3px",
                  }}
                >
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts?.map((p, index) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: `1px solid ${borderColor}`,
                    background:
                      index % 2 === 0
                        ? bgSecondary
                        : isDark
                        ? "#0a0a0a"
                        : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark
                      ? "#2a2a2a"
                      : "#f9fafb";
                    e.currentTarget.style.transform = "translateX(4px)";
                    e.currentTarget.style.boxShadow = isDark
                      ? "inset 4px 0 0 #071d63"
                      : "inset 4px 0 0 #3b82f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      index % 2 === 0
                        ? bgSecondary
                        : isDark
                        ? "#0a0a0a"
                        : "#ffffff";
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => handleViewProduct(p)}
                >
                  <td
                    style={{
                      padding: "18px 20px",
                      color: textPrimary,
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      {p.image && (
                        <img
                          src={getImageUrl(p.image)}
                          alt={p.name}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            objectFit: "cover",
                            border: `1px solid ${borderColor}`,
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      )}
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "18px 20px",
                      color: textPrimary,
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background:
                            p.stock > 10
                              ? "#10b981"
                              : p.stock > 5
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      />
                      {p.stock} units
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "18px 20px",
                      color: "#f59e0b",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    ₱{p.price?.toLocaleString() || "0"}
                  </td>
                  <td
                    style={{
                      padding: "18px 20px",
                      color: textSecondary,
                      fontSize: 14,
                    }}
                  >
                    <span
                      style={{
                        background: isDark ? "#2a2a2a" : "#e5e7eb",
                        color: textPrimary,
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        display: "inline-block",
                      }}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "18px 20px",
                      color: textSecondary,
                      fontSize: 14,
                      maxWidth: 350,
                    }}
                  >
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.5,
                      }}
                      title={p.description || "No description"}
                    >
                      {p.description || (
                        <span style={{ fontStyle: "italic", opacity: 0.5 }}>
                          No description
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Large Product View Modal */}
      {selectedProduct && (
        <Modal
          title={selectedProduct.name}
          onClose={() => setSelectedProduct(null)}
          maxWidth={700}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <div>
                <img
                  src={getImageUrl(selectedProduct.image)}
                  alt={selectedProduct.name}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
                  }}
                />
              </div>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Category
                  </div>
                  <div
                    style={{
                      color: textPrimary,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {selectedProduct.category.charAt(0).toUpperCase() +
                      selectedProduct.category.slice(1)}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Price
                  </div>
                  <div
                    style={{
                      color: "#f59e0b",
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    ₱{selectedProduct.price}
                  </div>
                </div>
                {isMainAdmin && selectedProduct.cost && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          color: textSecondary,
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Cost
                      </div>
                      <div
                        style={{
                          color: textPrimary,
                          fontSize: 18,
                          fontWeight: 600,
                        }}
                      >
                        ₱{selectedProduct.cost}
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          color: textSecondary,
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Margin
                      </div>
                      <div
                        style={{
                          color: "#10b981",
                          fontSize: 18,
                          fontWeight: 700,
                        }}
                      >
                        {(
                          ((selectedProduct.price - selectedProduct.cost) /
                            selectedProduct.price) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                  </>
                )}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      color: textSecondary,
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Stock
                  </div>
                  <div
                    style={{
                      color: textPrimary,
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {selectedProduct.stock} units
                  </div>
                </div>
              </div>
            </div>
            {selectedProduct.description && (
              <div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Description
                </div>
                <div
                  style={{
                    color: textPrimary,
                    fontSize: 16,
                    lineHeight: 1.6,
                  }}
                >
                  {selectedProduct.description}
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                paddingTop: 24,
                borderTop: `1px solid ${borderColor}`,
              }}
            >
              <button
                onClick={() => {
                  handleEdit(selectedProduct);
                  setSelectedProduct(null);
                }}
                style={{
                  background: "#071d63",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 16,
                  flex: 1,
                }}
              >
                Edit Product
              </button>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  handleDelete(selectedProduct.id);
                }}
                style={{
                  background: "#8a0707",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 16,
                  flex: 1,
                }}
              >
                Delete Product
              </button>
            </div>
          </div>
        </Modal>
      )}

      {filteredProducts.length === 0 && items && items.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            No products found matching your search
          </div>
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            Try adjusting your search terms or category filter
          </div>
        </div>
      )}

      {items?.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            No products found
          </div>
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            Click "Add Product" to create your first product
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, productId: null })}
        onConfirm={confirmDeleteProduct}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonStyle="danger"
      />
    </div>
  );
}
