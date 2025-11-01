document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault(); // prevent default anchor click
      try {
        const res = await fetch("/logout", { method: "GET" });
        const data = await res.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Logged out",
            text: data.message,
            timer: 2000,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = "/auth/login";
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message,
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Oops",
          text: "Something went wrong",
        });
      }
    });
  }
});
