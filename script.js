(function () {
  const storageKey = "venture-vault-energy-leads";
  const googleAppsScriptUrl = "https://script.google.com/u/0/home/projects/14EhJ7jg5fcFBoasgal0kXvVTinKmPFSiE2UMzNO26-TwsNLEo4H29D80/edit/exec";
  const leadForms = document.querySelectorAll("[data-lead-form]");
  const leadList = document.querySelector("[data-leads-list]");
  const billInput = document.querySelector("[data-bill-input]");
  const systemSize = document.querySelector("[data-system-size]");
  const monthlySavings = document.querySelector("[data-monthly-savings]");
  const yearlySavings = document.querySelector("[data-yearly-savings]");
  const revealTargets = document.querySelectorAll(
    ".quick-form-band, .contact-strip, .support-highlight, .service-card, .trust-band, .process-grid article, .savings-band, .gallery-grid img, .reviews-section, .review-card, .director-message, .director-stats div, .final-cta, .query-section, .lead-panel"
  );

  function readLeads() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function writeLeads(leads) {
    localStorage.setItem(storageKey, JSON.stringify(leads));
  }

  function renderLeads() {
    if (!leadList) return;

    const leads = readLeads();
    if (!leads.length) {
      leadList.innerHTML = "<p>No enquiries saved in this browser yet.</p>";
      return;
    }

    leadList.innerHTML = leads
      .slice()
      .reverse()
      .map((lead) => {
        const details = [lead.phone, lead.city, lead.bill, lead.property].filter(Boolean).join(" | ");
        return `
          <div class="lead-item">
            <strong>${escapeHtml(lead.name)}</strong>
            <span>${escapeHtml(details || "Phone enquiry")}</span>
            <span>${escapeHtml(new Date(lead.createdAt).toLocaleString())}</span>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function collectLead(form) {
    const formData = new FormData(form);
    return {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      bill: String(formData.get("bill") || "").trim(),
      property: String(formData.get("property") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      createdAt: new Date().toISOString()
    };
  }

  function validateLead(lead) {
    const phoneDigits = lead.phone.replace(/\D/g, "");
    return lead.name.length >= 2 && phoneDigits.length >= 10;
  }

  function encodeFormData(form) {
    return new URLSearchParams(new FormData(form)).toString();
  }

  async function submitToNetlify(form) {
    if (!form.matches("[data-netlify-submit]")) return true;

    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeFormData(form)
    });

    return response.ok;
  }

  async function submitToGoogleSheet(lead) {
    if (!googleAppsScriptUrl) return null;

    await fetch(googleAppsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        ...lead,
        pageUrl: window.location.href,
        source: "Venture Vault Energy website"
      })
    });

    return true;
  }

  leadForms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      const lead = collectLead(form);

      if (!validateLead(lead)) {
        if (status) status.textContent = "Please enter a valid name and phone number.";
        return;
      }

      const leads = readLeads();
      leads.push(lead);
      writeLeads(leads);
      renderLeads();

      if (status) {
        status.textContent = "Saving your query...";
      }

      try {
        const googleSaved = await submitToGoogleSheet(lead);
        const netlifySaved = googleSaved || await submitToNetlify(form);
        form.reset();
        if (status) {
          status.textContent = googleSaved
            ? "Thank you. Your query has been sent to our team."
            : netlifySaved
            ? "Thank you. Your query has been received for a callback."
            : "Thank you. Your query is saved in this browser. Please call us if you do not receive a callback.";
        }
      } catch (error) {
        form.reset();
        if (status) {
          status.textContent = "Thank you. Your query is saved in this browser. Please call us if you do not receive a callback.";
        }
      }
    });
  });

  function formatRupees(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value).replace("₹", "Rs. ");
  }

  function updateSavings() {
    if (!billInput || !systemSize || !monthlySavings || !yearlySavings) return;
    const bill = Math.max(Number(billInput.value) || 0, 0);
    const tariffPerUnit = 8;
    const monthlyUnitsPerKw = 120;
    const estimatedMonthlyUnits = bill / tariffPerUnit;
    const recommendedKw = Math.max(1, estimatedMonthlyUnits / monthlyUnitsPerKw);
    const roundedKw = Math.ceil(recommendedKw * 10) / 10;
    const monthly = Math.min(
      bill,
      Math.round(roundedKw * monthlyUnitsPerKw * tariffPerUnit)
    );
    systemSize.textContent = `${roundedKw.toFixed(1)} kW`;
    monthlySavings.textContent = formatRupees(monthly);
    yearlySavings.textContent = formatRupees(monthly * 12);
    pulseUpdated([systemSize, monthlySavings, yearlySavings]);
  }

  function pulseUpdated(elements) {
    elements.forEach((element) => {
      element.classList.remove("is-updated");
      window.requestAnimationFrame(() => {
        element.classList.add("is-updated");
        window.setTimeout(() => element.classList.remove("is-updated"), 260);
      });
    });
  }

  function setupRevealAnimation() {
    if (!revealTargets.length) return;

    revealTargets.forEach((target) => target.classList.add("reveal-on-scroll"));

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14 }
    );

    revealTargets.forEach((target) => observer.observe(target));
  }

  if (billInput) {
    billInput.addEventListener("input", updateSavings);
    updateSavings();
  }

  setupRevealAnimation();
  renderLeads();
})();
