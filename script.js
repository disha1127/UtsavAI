// This script handles form submission, filtering, scoring, and rendering

document.getElementById("event-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const city = document.getElementById("city").value.trim();
  const eventDate = document.getElementById("eventDate").value;
  const budget = parseFloat(document.getElementById("budget").value);

  const categoryWeights = {
    venue: 0.25,
    catering: 0.3,
    photography: 0.15,
    decoration: 0.1,
    entertainment: 0.1,
    seating_lighting: 0.05,
    invitations: 0.03,
    stage_setup: 0.02
  };

  const vendorResponse = await fetch("data/final_vendor_dataset.csv");
  const vendorText = await vendorResponse.text();
  const vendors = parseCSV(vendorText);

  const filtered = vendors.filter((v) => {
    return (
      v.city.toLowerCase() === city.toLowerCase() &&
      !v.unavailable_dates.includes(eventDate)
    );
  });

  const grouped = groupBy(filtered, "type");
  let html = "";
  let total = 0;

  for (const category in grouped) {
    const categoryBudget = budget * (categoryWeights[category] || 0.05);
    const scored = grouped[category]
      .map((v) => {
        v.price = parseFloat(v.price);
        v.rating = parseFloat(v.rating);
        v.match_score = (v.rating * 2) - (v.price / categoryBudget) * 5;
        return v;
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 3);

    html += `<details><summary><h3>${category}</h3></summary>`;
    scored.forEach((v) => {
      const checklistId = `${v.name.replace(/\s+/g, '_')}_checklist`;
      html += `
        <div class="card">
          <strong>${v.name}</strong><br />
          Price: ₹${v.price} <br />
          Rating: ${v.rating} <br />
          Score: ${v.match_score.toFixed(2)} <br />
          Style: ${v.style_tags} | Eco: ${v.eco_friendly}
          <div class="checklist">
            <label><input type="checkbox" onchange="saveChecklist('${checklistId}', 0)"> Inquiry Sent</label><br />
            <label><input type="checkbox" onchange="saveChecklist('${checklistId}', 1)"> Booking Confirmed</label><br />
            <label><input type="checkbox" onchange="saveChecklist('${checklistId}', 2)"> Delivery Scheduled</label>
          </div>
        </div>
      `;
      total += v.price;
    });
    html += `</details>`;
  }

  document.getElementById("vendor-results").innerHTML = html;

  const budgetDiv = document.getElementById("budget-summary");
  const status = total > budget ? "Over Budget" : "Within Budget";
  const color = total > budget ? "red" : "green";
  budgetDiv.innerHTML = `
    <h3 style="color:${color};">
      Estimated Total: ₹${total} / ₹${budget} (${status})
    </h3>`;

  const ngoRes = await fetch("data/final_food_donation_ngos.csv");
  const ngoText = await ngoRes.text();
  const ngos = parseCSV(ngoText).filter((n) => n.city.toLowerCase() === city.toLowerCase());
  const ngoHTML = ngos
    .slice(0, 2)
    .map(
      (n) => `
    <div class="card">
      <strong>${n.organization_name}</strong><br />
      Phone: ${n.phone}<br />
      Email: ${n.email}<br />
      Pickup: ${n.pickup_available}<br />
      Notes: ${n.notes}
    </div>`)
    .join("");
  document.getElementById("ngo-suggestions").innerHTML = `<h3>Nearby NGOs for Food Donation</h3>${ngoHTML}`;

  restoreChecklistStates();
});

function parseCSV(data) {
  const lines = data.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });
}

function groupBy(arr, key) {
  return arr.reduce((acc, obj) => {
    (acc[obj[key]] = acc[obj[key]] || []).push(obj);
    return acc;
  }, {});
}

function saveChecklist(id, index) {
  const checkboxes = document.querySelectorAll(`[onchange*="${id}"]`);
  const states = Array.from(checkboxes).map(cb => cb.checked);
  localStorage.setItem(id, JSON.stringify(states));
}

function restoreChecklistStates() {
  const checklists = document.querySelectorAll('.checklist');
  checklists.forEach((box) => {
    const inputs = box.querySelectorAll('input');
    const id = inputs[0].getAttribute('onchange').match(/'(.*?)'/)[1];
    const stored = localStorage.getItem(id);
    if (stored) {
      JSON.parse(stored).forEach((state, i) => {
        inputs[i].checked = state;
      });
    }
  });
}
