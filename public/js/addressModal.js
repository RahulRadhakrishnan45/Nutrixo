document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("addressModal");
  if (!modal) return;

  const form = document.getElementById("addressForm");
  const modalTitle = document.getElementById("addressModalTitle");
  const submitBtn = document.getElementById("submitAddressBtn");
  const addressIdInput = document.getElementById("addressId");
  const closeBtn = document.getElementById("closeModal");
  const cancelBtn = document.getElementById("cancelBtn");

  // ✅ Toastr setup
  toastr.options = {
    closeButton: true,
    progressBar: true,
    positionClass: "toast-bottom-right",
    timeOut: "2000"
  };

  // ✅ Form validation helper
  function validateForm(data) {
    if (!data.fullname?.trim()) return "Full Name is required";
    if (!/^[0-9]{10}$/.test(data.mobile)) return "Enter a valid 10-digit Mobile number";
    if (!data.address?.trim()) return "Address is required";
    if (!data.district?.trim()) return "District is required";
    if (!data.state?.trim()) return "State is required";
    if (!data.country?.trim()) return "Country is required";
    if (!/^[0-9]{6}$/.test(data.pincode)) return "Enter a valid 6-digit Pincode";
    return null;
  }

  // ✅ Open modal (Add)
  document.querySelectorAll(".add-new-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modalTitle.textContent = "Add New Address";
      submitBtn.textContent = "Save Address";
      addressIdInput.value = "";
      form.reset();
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
  });

  // ✅ Open modal (Edit)
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const card = document.getElementById(`address-${id}`);

      modalTitle.textContent = "Edit Address";
      submitBtn.textContent = "Save Changes";
      addressIdInput.value = id;

      // Fill form with current values
      form.fullname.value = card.querySelector("input[data-field='fullname']").value;
      form.mobile.value = card.querySelector("input[data-field='mobile']").value;
      form.address.value = card.querySelector("input[data-field='address']").value;
      form.district.value = card.querySelector("input[data-field='district']").value;
      form.state.value = card.querySelector("input[data-field='state']").value;
      form.country.value = card.querySelector("input[data-field='country']").value;
      form.pincode.value = card.querySelector("input[data-field='pincode']").value;

      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
  });

  // ✅ Close modal function
  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    form.reset();
  };
  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);

  // ✅ Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      fullname: form.fullname.value.trim(),
      mobile: form.mobile.value.trim(),
      address: form.address.value.trim(),
      district: form.district.value.trim(),
      state: form.state.value.trim(),
      country: form.country.value.trim(),
      pincode: form.pincode.value.trim(),
    };

    const error = validateForm(formData);
    if (error) return toastr.error(error);

    const id = addressIdInput.value;
    const url = id ? `/profile/address/${id}` : "/profile/address";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        toastr.success(data.message || (id ? "Address updated!" : "Address added!"));
        closeModal();

        // ✅ Smart redirect logic:
        const currentPath = window.location.pathname;

        if (currentPath.startsWith("/checkout")) {
          // If currently on checkout → stay there
          setTimeout(() => {
            window.location.href = `/checkout?selected=${id || "new"}`;
          }, 600);
        } else if (currentPath.startsWith("/profile/address")) {
          // If on address page → reload
          setTimeout(() => window.location.reload(), 600);
        } else {
          // fallback for any other route
          setTimeout(() => window.location.reload(), 600);
        }

      } else {
        toastr.error(data.message || "Failed to save address");
      }
    } catch (err) {
      toastr.error("Something went wrong. Try again!");
    }
  });
});

