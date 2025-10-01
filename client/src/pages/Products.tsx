import * as React from "react";
import { Modal } from "../components/Modal";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  is_active: boolean;
}

export default function Products() {
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
    stock: "",
    category: "supplements",
    is_active: true,
  });
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filter products based on search term
  const filteredProducts = React.useMemo(() => {
    if (!items) return [];

    return items.filter((product) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower) ||
        product.price.toString().includes(searchLower) ||
        product.stock.toString().includes(searchLower) ||
        (product.is_active ? "active" : "inactive").includes(searchLower)
      );
    });
  }, [items, searchTerm]);

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

  const fetchProducts = React.useCallback(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    setLoading(true);
    setError(null);

    fetch("/api/products", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then((data) => {
        setItems(data.data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
        setError(err.message || "Failed to load products");
        setItems(null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
          const requestData = {
            name: formData.name,
            description: formData.description,
            price: formData.price,
            stock: formData.stock,
            category: formData.category,
            is_active: formData.is_active,
            image: editingProduct.image, // Keep the current image
          };

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
    } catch (err) {
      console.error("Error saving product:", err);
      setError(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      is_active: product.is_active,
    });
    setImageFile(null);
    setImagePreview(product.image);
    setShowEditForm(true);
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingProduct(id);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setDeletingProduct(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#9ca3af" }}>
          Loading products...
        </div>
      </div>
    );
  }

  if (error && !items) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 16 }}>
          Failed to load products
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
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>
          Products
        </h2>
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
          {showAddForm ? "Cancel" : "Add Product"}
        </button>
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
          title={editingProduct ? "Edit Product" : "Add New Product"}
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
                  color: "#e5e7eb",
                  fontWeight: 600,
                }}
              >
                Product Name *
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#e5e7eb",
                  fontWeight: 600,
                }}
              >
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  padding: "12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              >
                <option value="supplements">Supplements</option>
                <option value="equipment">Equipment</option>
                <option value="apparel">Apparel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#e5e7eb",
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#e5e7eb",
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#e5e7eb",
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
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
                  color: "#e5e7eb",
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
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
                style={{ color: "#e5e7eb", fontSize: 14, fontWeight: 500 }}
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
            placeholder="Search products by name, description, category, price, stock, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "#1a1a1a",
              border: "1px solid #374151",
              borderRadius: 8,
              color: "#e5e7eb",
              fontSize: 14,
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
            {filteredProducts.length} product
            {filteredProducts.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

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
              background: "#1a1a1a",
              borderRadius: 12,
              border: "1px solid #4b5563",
              padding: 16,
              position: "relative",
            }}
          >
            <div
              style={{
                height: 160,
                background: "#1a1a1a",
                borderRadius: 8,
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
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                {p.name}
              </div>
              <div style={{ color: "#d1d5db", fontSize: 12, marginBottom: 4 }}>
                {p.category.charAt(0).toUpperCase() + p.category.slice(1)}
              </div>
              <div style={{ color: "#f59e0b", fontSize: 18, fontWeight: 700 }}>
                ₱{p.price}
              </div>
              <div style={{ color: "#e5e7eb", fontSize: 12 }}>
                Stock: {p.stock} units
              </div>
              {p.description && (
                <div
                  style={{
                    color: "#e5e7eb",
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

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleEdit(p)}
                style={{
                  flex: 1,
                  background: "#f59e0b",
                  color: "#111827",
                  border: 0,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deletingProduct === p.id}
                style={{
                  flex: 1,
                  background: deletingProduct === p.id ? "#6b7280" : "#ef4444",
                  color: "#ffffff",
                  border: 0,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontWeight: 700,
                  cursor: deletingProduct === p.id ? "not-allowed" : "pointer",
                  fontSize: 12,
                }}
              >
                {deletingProduct === p.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
}
