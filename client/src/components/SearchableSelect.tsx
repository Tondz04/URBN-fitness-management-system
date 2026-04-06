import * as React from "react";
import { useTheme } from "../contexts/ThemeContext";

interface SearchableSelectOption {
  value: string | number;
  label: string;
  subtitle?: string; // For showing price or additional info
}

interface SearchableSelectProps {
  value: string | number | "";
  onChange: (value: string | number) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  required?: boolean;
  label?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  onNoResults?: () => void; // Callback when no results found
  noResultsText?: string; // Custom text for no results
  showAddOption?: boolean; // Show "Add new" option when no results
  size?: "small" | "medium" | "large"; // Size variant
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  required = false,
  label,
  searchPlaceholder = "Search...",
  disabled = false,
  onNoResults,
  noResultsText,
  showAddOption = false,
  size = "medium",
}: SearchableSelectProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const bgPrimary = isDark ? "#0a0a0a" : "#ffffff";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const bgTertiary = isDark ? "#2a2a2a" : "#e5e7eb";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

  // Get selected option label (normalize value comparison)
  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  );

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;

    const term = searchTerm.toLowerCase();
    return options.filter((opt) => {
      const labelMatch = opt.label.toLowerCase().includes(term);
      const subtitleMatch = opt.subtitle?.toLowerCase().includes(term);
      const valueMatch = String(opt.value).toLowerCase().includes(term);
      return labelMatch || subtitleMatch || valueMatch;
    });
  }, [options, searchTerm]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        minWidth: 0, // Prevent grid overflow
        boxSizing: "border-box",
      }}
    >
      {label && (
        <label
          style={{
            display: "block",
            color: textSecondary,
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          {label}
          {required && (
            <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
          )}
        </label>
      )}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          background: disabled ? bgTertiary : bgPrimary,
          border: `1px solid ${borderColor}`,
          borderRadius: size === "small" ? "4px" : "8px",
          padding: size === "small" ? "4px 8px" : size === "large" ? "16px 20px" : "12px 16px",
          color: textPrimary,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: size === "small" ? "11px" : size === "large" ? "18px" : "16px",
          minHeight: size === "small" ? "auto" : size === "large" ? "56px" : "48px",
          height: size === "small" ? "auto" : undefined,
          transition: "all 0.2s ease",
          opacity: disabled ? 0.6 : 1,
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = isDark ? "#3a3a3a" : "#9ca3af";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = borderColor;
          }
        }}
      >
        <span
          style={{
            flex: 1,
            color: selectedOption ? textPrimary : textSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedOption ? (
            <div>
              <div style={{ fontWeight: 500, fontSize: size === "small" ? "11px" : undefined }}>{selectedOption.label}</div>
              {selectedOption.subtitle && (
                <div
                  style={{
                    fontSize: size === "small" ? "10px" : "13px",
                    color: textSecondary,
                    marginTop: 2,
                  }}
                >
                  {selectedOption.subtitle}
                </div>
              )}
            </div>
          ) : (
            placeholder
          )}
        </span>
        <span
          style={{
            fontSize: size === "small" ? "9px" : size === "large" ? "14px" : "12px",
            color: textSecondary,
            marginLeft: size === "small" ? "4px" : "8px",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: size === "small" ? "auto" : 0,
            width: size === "small" ? "max-content" : "100%",
            minWidth: size === "small" ? "100%" : undefined,
            marginTop: "4px",
            background: bgPrimary,
            border: `1px solid ${borderColor}`,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            maxHeight: "300px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "fadeInDown 0.2s ease-out",
          }}
        >
          {/* Search Input */}
          <div
            style={{
              padding: "12px",
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                background: bgSecondary,
                border: `1px solid ${borderColor}`,
                borderRadius: "6px",
                padding: "8px 12px",
                color: textPrimary,
                fontSize: "14px",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div>
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: textSecondary,
                    fontSize: "14px",
                  }}
                >
                  {noResultsText || "No results found"}
                </div>
                {showAddOption && onNoResults && (
                  <div
                    onClick={() => {
                      onNoResults();
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      background: bgSecondary,
                      borderTop: `1px solid ${borderColor}`,
                      color: isDark ? "#60a5fa" : "#3b82f6",
                      fontSize: "14px",
                      fontWeight: 600,
                      textAlign: "center",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = bgTertiary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = bgSecondary;
                    }}
                  >
                    + Add new customer
                  </div>
                )}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    style={{
                      padding: size === "small" ? "8px 12px" : "12px 16px",
                      cursor: "pointer",
                      background: isSelected ? bgSecondary : "transparent",
                      borderLeft: isSelected
                        ? `3px solid ${isDark ? "#60a5fa" : "#3b82f6"}`
                        : "3px solid transparent",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = bgSecondary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        color: textPrimary,
                        fontSize: "15px",
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      {option.label}
                    </div>
                    {option.subtitle && (
                      <div
                        style={{
                          color: textSecondary,
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      >
                        {option.subtitle}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
