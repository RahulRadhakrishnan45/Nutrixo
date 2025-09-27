// constants/messages.js
const messages = Object.freeze({
    AUTH: {
        USER_NOT_FOUND: "User not found. Please sign up",
        USER_EXISTS: "User already exists",
        NUMBER_EXISTS: "Number already exists",
        SESSION_EXPIRED: "Session expired. Please try again",
        PASSWORD_MISMATCH: "Passwords do not match",
        PASSWORD_INVALID: "Password does not match",
        PASSWORD_RESET_SUCCESS: "Password reset successful",
        LOGIN_SUCCESS: "Login successful",
        LOGIN_FAILED: "Invalid email or password",
        ACCOUNT_BLOCKED: "Your account has been blocked by the admin",
        LOGOUT_SUCCESS: "Logged out successfully",
        LOGOUT_FAILED: "Logout failed",
        SIGNUP_SUCCESS: "Signup successful",
        INVALID_REQUEST:"Invalid request",
        ALL_FIELDS_REQUIRED:"All fields are required",
        ENTER_VALID_NO:"Enter a valid 10 digit number",
        ENTER_VALID_PINCODE:"Enter a valid 6 digit pincode",
    },
    OTP: {
        SENT: "OTP sent successfully",
        FAILED: "Email send failed",
        EXPIRED: "OTP has expired. Please try again",
        VERIFIED: "OTP verified. Redirecting...",
        INVALID_PURPOSE: "Invalid OTP purpose. Please restart the process.",
        VERIFICATION_FAILED: "OTP Verification failed, Please try again",
        RESENT: "OTP resent successfully",
        RESEND_FAILED: "Failed to resend OTP. Please try again",
        EMAIL_NOT_FOUND: "Email not found in session"
    },
    ADMIN: {
        INVALID_EMAIL: "Invalid email",
        INVALID_PASSWORD: "Invalid password",
        WELCOME: "Welcome back Admin"
    },
    GENERAL: {
        SERVER_ERROR: "Something went wrong. Please try again later"
    },
    CATEGORY: {
        CATEGORY_ADD:"Category added successfully",
        CATEGORY_ADD_ERROR:"Category is not added. Please try again",
        CATEGORY_NOT_FOUND:'Category not found',
        CATEGORY_LISTED:"Category listed successfully",
        CATEGORY_UNLISTED:"Category unlisted successfully",
        CATEGORY_EXISTS:"Category already exists",
        CATEGORY_UPDATE:'Category updated',
        CATEGORY_DELETED:"Category deleted",
        CATEGORY_RESTORE:'Category restored successfully'
    },
    BRAND:{
        BRAND_EXISTS:"Brand already exists",
        BRAND_ADD:"Brand added successfully",
        BRAND_NOT_FOUND:"Brand not found",
        BRAND_DELETED:"Brand deleted successfully",
        BRAND_RESTORED:"Brand restored successfully",
        BRAND_ACTIVATED:"Brand activated successfully",
        BRAND_BLOCKED:"Brand blocked successfully"
    },
    PRODUCT:{
        PRODUCT_ADD:"Product added successfully",
        PRODUCT_NOT_FOUND:"Product not found",
        PRODUCT_UPDATE:"Product updated successfully",
        PRODUCT_EXISTS:"Product already exists"
    },
    VARIANT:{
        VARIANT_NOT_FOUND:"Variant not found",
        VARIANT_DELETE:"Variant deleted successfully",
        VARIANT_RESTORE:"Variant restored successfully",
        VARIANT_EXISTS:"Variant already exists"
    },
    USER:{
        USER_NOT_FOUND:"User not found",
        USER_UNBLOCKED:"User unblocked successfully",
        USER_BLOCKED:"User blocked successfully",
        USER_EXISTS:"User already exists",
        USER_MOB_EXISTS:"User mobile number already exists",
        USER_NOT_LOGIN:"User not logged in"
    },
    CART:{
        CART_ADD_FAILED:"Please login to add to cart",
        CART_ADD:"Item added to cart",
        CART_NOT_FOUND:"Cart not found"
    },
    STOCK:{
        OUT_OF_STOCK:"Not enough stock quantity",
        STOCK_ALLOWED:"Max 5 quantity per product allowed"
    },
    FILE:{
        NO_FILE:"No file uploaded"
    },
    PROFILE:{
        PROFILE_IMG_UPDATE:"Profile image updated successfully",
        PROFILE_IMG_DELETE:"Profile image removed successfully",
    },
    ADDRESS:{
        ADDRESS_ADDED:"Address added successfully",
        ADDRESS_NOT_FOUND:"Address not found",
        ADDRESS_UPDATED:"Address updated successfully",
        ADDRESS_DELETED:"Address deleted successfully",
        DEFAULT_ADDRESS:"Default address updated successfully",
    }
});

module.exports = messages;
