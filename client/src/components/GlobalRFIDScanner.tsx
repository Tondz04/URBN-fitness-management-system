import * as React from "react";
import { useNotification } from "../contexts/NotificationContext";

/**
 * Global RFID Scanner Component
 * 
 * This component listens for RFID scans globally across all pages.
 * It uses a hidden input field that's always ready to receive input
 * from USB RFID readers (which act as keyboard wedges).
 */
export function GlobalRFIDScanner() {
  const { showSuccess, showError } = useNotification();
  const [rfidBuffer, setRfidBuffer] = React.useState("");
  const [lastScanTime, setLastScanTime] = React.useState(0);
  const rfidTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keep the input focused so it can receive RFID scans
  // RFID readers act as keyboard wedges, so we need an input field to capture the input
  React.useEffect(() => {
    const refocusInput = () => {
      // Only refocus if user is not actively typing in another input/textarea
      const activeElement = document.activeElement;
      if (
        inputRef.current &&
        activeElement?.tagName !== "INPUT" &&
        activeElement?.tagName !== "TEXTAREA"
      ) {
        // Small delay to avoid interfering with clicks
        setTimeout(() => {
          if (inputRef.current && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
            inputRef.current.focus();
          }
        }, 100);
      }
    };

    // Focus the input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Refocus when window regains focus
    window.addEventListener("focus", refocusInput);
    
    // Refocus after clicks (but not on input/textarea clicks)
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        refocusInput();
      }
    }, true);

    // Refocus when user stops typing in other fields
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        // Wait a bit to see if focus moves to another input
        setTimeout(() => {
          if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
            refocusInput();
          }
        }, 200);
      }
    };

    document.addEventListener("focusout", handleBlur);

    return () => {
      window.removeEventListener("focus", refocusInput);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  // Handle RFID input
  const handleRFIDInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRfidBuffer(value);

    // Clear any existing timeout
    if (rfidTimeoutRef.current) {
      clearTimeout(rfidTimeoutRef.current);
    }

    // Don't process empty values
    if (!value || value.trim().length === 0) return;

    const trimmedValue = value.trim();

    // Process if we have at least 4 characters (minimum RFID tag length)
    if (trimmedValue.length >= 4) {
      // Debounce: Wait 500ms after last keystroke before processing
      rfidTimeoutRef.current = setTimeout(async () => {
        // Only process if at least 500ms have passed since last scan
        const now = Date.now();
        if (now - lastScanTime < 500) {
          setRfidBuffer("");
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
        setLastScanTime(now);

        await processRFIDScan(trimmedValue);
        // Clear input after processing
        setRfidBuffer("");
        if (inputRef.current) {
          inputRef.current.value = "";
          // Refocus to be ready for next scan
          setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
          }, 100);
        }
      }, 500); // Wait 500ms after last keystroke
    }
  };

  // Handle key press events (for Enter key or when RFID reader sends Enter)
  const handleRFIDKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && rfidBuffer.trim().length >= 4) {
      e.preventDefault();

      // Clear any pending timeout
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
        rfidTimeoutRef.current = null;
      }

      const now = Date.now();
      if (now - lastScanTime < 500) {
        setRfidBuffer("");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setLastScanTime(now);
      await processRFIDScan(rfidBuffer.trim());
      setRfidBuffer("");
      if (inputRef.current) {
        inputRef.current.value = "";
        // Refocus to be ready for next scan
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 100);
      }
    }
  };

  // Process RFID scan
  const processRFIDScan = async (rfidTag: string) => {
    if (!rfidTag || rfidTag.trim().length < 4) {
      return; // Silently ignore invalid tags
    }

    try {
      console.log("Processing global RFID scan:", rfidTag);
      const response = await fetch("/api/rfid/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rfid_tag: rfidTag.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data && data.data.status === "granted") {
          showSuccess(data.message || "Access granted!");
        } else {
          showError(data.message || "Access denied");
        }

        // Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent("trackingDataUpdated"));
      } else {
        showError(data.message || "Failed to process RFID scan");
        console.error("RFID scan API error:", data);
      }
    } catch (err: any) {
      showError("Failed to process RFID scan. Please try again.");
      console.error("RFID scan error:", err);
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={rfidBuffer}
      onChange={handleRFIDInput}
      onKeyPress={handleRFIDKeyPress}
      autoComplete="off"
      style={{
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}

