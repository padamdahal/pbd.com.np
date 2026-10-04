(() => {
  "use strict";

  // Real Nepali first names – curated for authenticity
  // style: "traditional" | "modern"
  const NAMES = {
    male: {
      traditional: [
        "Aakash", "Achyut", "Aditya", "Agni", "Ajay", "Amit", "Amrit", "Anil", "Anup", "Arjun",
        "Ashish", "Ashok", "Bharat", "Bhim", "Bikash", "Binod", "Bipin", "Bishnu", "Bishwajeet", "Buddhi",
        "Chandra", "Deepak", "Dev", "Dhananjay", "Dharma", "Dinesh", "Dipendra", "Ganesh", "Gaurav", "Gopal",
        "Govinda", "Hari", "Hemant", "Indra", "Jagdish", "Kamal", "Kedar", "Keshav", "Kiran", "Krishna",
        "Kumar", "Laxman", "Madhav", "Mahesh", "Manish", "Mohan", "Mukesh", "Nabin", "Narayan", "Niraj",
        "Nischal", "Pawan", "Prabin", "Pradeep", "Prakash", "Pramod", "Prashant", "Prem", "Purna", "Raj",
        "Rajan", "Rajendra", "Rakesh", "Ram", "Ramesh", "Ravi", "Roshan", "Sabin", "Sagar", "Sajan",
        "Sanjay", "Santosh", "Saroj", "Satish", "Shankar", "Shiva", "Shyam", "Suman", "Sunil", "Suraj",
        "Suresh", "Surya", "Umesh", "Uttam", "Vijay", "Vinod", "Yogesh", "Yubaraj", "Basanta", "Bimal",
        "Bhola", "Chudamani", "Dhruba", "Gajendra", "Harka", "Jitendra", "Khadga", "Lalit", "Manohar", "Nara",
        "Om", "Padam", "Parsuram", "Rabindra", "Rudra", "Sambhu", "Shailendra", "Subash", "Sushil", "Tikaram"
      ],
      modern: [
        "Aarav", "Aayan", "Abiral", "Adarsha", "Aayush", "Aashish", "Ankit", "Anmol", "Arnav", "Aryan",
        "Ashim", "Ayush", "Bibek", "Bipul", "Darshan", "Diwas", "Ishan", "Kabir", "Kiran", "Krish",
        "Kushal", "Niraj", "Nischal", "Paras", "Pranish", "Pratik", "Priyanshu", "Rajan", "Rishav", "Rohan",
        "Ronish", "Sabin", "Sahil", "Samir", "Samyak", "Sandesh", "Sankalpa", "Saurav", "Shreyan", "Siddhartha",
        "Suyog", "Ujjwal", "Yug", "Aakrit", "Aarush", "Abhinav", "Aditya", "Amitesh", "Anish", "Avinash",
        "Bibek", "Chirag", "Dikshant", "Himal", "Ishan", "Jay", "Kush", "Manish", "Nirjal", "Prabesh",
        "Pranjal", "Ritik", "Rohan", "Sagar", "Sambridh", "Sanjog", "Sarthak", "Shubham", "Suyash", "Yash"
      ]
    },
    female: {
      traditional: [
        "Aasha", "Ambika", "Anjali", "Anju", "Apsara", "Basanti", "Bimala", "Bishnu", "Chandra", "Devi",
        "Durga", "Gauri", "Geeta", "Gita", "Indira", "Jamuna", "Kalpana", "Kamala", "Kanti", "Kaushila",
        "Laxmi", "Lila", "Madhavi", "Maya", "Meena", "Muna", "Nirmala", "Parbati", "Pramila", "Radha",
        "Rama", "Rekha", "Rita", "Sabitri", "Sabitra", "Sita", "Saraswati", "Sarita", "Shanti", "Sharmila",
        "Shova", "Sita", "Srijana", "Sujata", "Suman", "Sunita", "Sushila", "Tara", "Tulsi", "Uma",
        "Urmila", "Yamuna", "Bishakha", "Champa", "Ganga", "Hira", "Jamuna", "Kalpana", "Kumari", "Laxmi",
        "Manju", "Mina", "Naina", "Padma", "Purna", "Rama", "Sabita", "Sanjita", "Sharda", "Shova",
        "Sita", "Sushma", "Tika", "Usha", "Bishnu", "Devi", "Gauri", "Indu", "Kamala", "Laxmi",
        "Maya", "Parbati", "Radha", "Sabitri", "Saraswati", "Sita", "Tara", "Uma", "Ambika", "Anju"
      ],
      modern: [
        "Aarati", "Aayusha", "Aayushi", "Anisha", "Anisha", "Anju", "Ankita", "Anmol", "Apsara", "Asmita",
        "Binita", "Bipana", "Dikshya", "Isha", "Kriti", "Manisha", "Niharika", "Nisha", "Pragya", "Prisha",
        "Priya", "Puja", "Rabina", "Rachana", "Ritisha", "Sabina", "Samikshya", "Sandhya", "Sangita", "Sarita",
        "Shristi", "Shruti", "Simran", "Sneha", "Soniya", "Srijana", "Srijana", "Sunayana", "Sushmita", "Swikriti",
        "Aakriti", "Aarohi", "Aditi", "Aisha", "Amisha", "Ananya", "Anshu", "Anushka", "Ashika", "Astha",
        "Bimala", "Diya", "Grishma", "Isha", "Jiya", "Kripa", "Kritika", "Manisha", "Nisha", "Pari",
        "Pragati", "Pranjali", "Preeti", "Priyanka", "Rachana", "Ritika", "Samridhi", "Sanskriti", "Shreya", "Siya"
      ]
    }
  };

  // Light meanings for common names (optional display)
  const MEANINGS = {
    "Aarav": "Peaceful, wise",
    "Aayush": "Long life",
    "Aditya": "Sun",
    "Anil": "Wind, air",
    "Arjun": "Bright, shining (from Mahabharata)",
    "Ashish": "Blessing",
    "Bikash": "Development, progress",
    "Bishnu": "Preserver (Hindu deity)",
    "Deepak": "Lamp, light",
    "Ganesh": "Lord of beginnings",
    "Gopal": "Protector of cows (Krishna)",
    "Hari": "Lord Vishnu",
    "Krishna": "Dark, attractive (Hindu deity)",
    "Prakash": "Light",
    "Prem": "Love",
    "Ram": "Pleasing (Lord Rama)",
    "Ramesh": "Lord of Rama",
    "Sagar": "Ocean",
    "Santosh": "Contentment",
    "Shiva": "Auspicious (Hindu deity)",
    "Suman": "Good minded, flower",
    "Surya": "Sun",
    "Anjali": "Offering, tribute",
    "Laxmi": "Goddess of wealth",
    "Maya": "Illusion, affection",
    "Prisha": "Beloved, God's gift",
    "Priya": "Beloved",
    "Sabina": "Modern form of Sabitri",
    "Saraswati": "Goddess of knowledge",
    "Sita": "Furrow (from Ramayana)",
    "Sunita": "Well-behaved, good manners",
    "Tara": "Star",
    "Aayusha": "Long life",
    "Kriti": "Creation, work",
    "Niharika": "Milky Way, galaxy",
    "Pragya": "Wisdom, intelligence",
    "Samikshya": "Analysis, review",
    "Shristi": "Creation",
    "Srijana": "Creation"
  };

  // Deduplicate within each list while preserving order
  function unique(arr) {
    const seen = new Set();
    return arr.filter((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  Object.keys(NAMES).forEach((g) => {
    Object.keys(NAMES[g]).forEach((s) => {
      NAMES[g][s] = unique(NAMES[g][s]);
    });
  });

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getPool(gender, style) {
    const genders = gender === "any" ? ["male", "female"] : [gender];
    const styles = style === "any" ? ["traditional", "modern"] : [style];
    let pool = [];
    genders.forEach((g) => {
      styles.forEach((s) => {
        pool = pool.concat(NAMES[g][s] || []);
      });
    });
    return unique(pool);
  }

  function generate(count, gender, style) {
    const pool = getPool(gender, style);
    if (pool.length === 0) return [];
    const result = [];
    const used = new Set();
    let attempts = 0;
    while (result.length < count && attempts < count * 8) {
      attempts++;
      const name = pick(pool);
      const key = name.toLowerCase();
      if (used.has(key)) continue;
      used.add(key);
      result.push({
        name,
        meaning: MEANINGS[name] || null
      });
    }
    return result;
  }

  // UI
  const genderEl = document.getElementById("gender");
  const styleEl = document.getElementById("style");
  const countEl = document.getElementById("count");
  const generateBtn = document.getElementById("generate");
  const resultsEl = document.getElementById("results");
  const copyAllBtn = document.getElementById("copy-all");
  const statusEl = document.getElementById("status");

  function render(names) {
    if (!names.length) {
      resultsEl.innerHTML = `<p class="muted">No names found for this combination. Try different filters.</p>`;
      copyAllBtn.hidden = true;
      return;
    }
    resultsEl.innerHTML = names
      .map(
        (item, i) => `
      <div class="name-card" data-name="${item.name}">
        <div class="name-main">
          <span class="name-text">${item.name}</span>
          ${item.meaning ? `<span class="name-meaning">${item.meaning}</span>` : ""}
        </div>
        <button type="button" class="btn btn-sm copy-one" data-name="${item.name}" aria-label="Copy ${item.name}">Copy</button>
      </div>`
      )
      .join("");
    copyAllBtn.hidden = false;
    statusEl.textContent = `${names.length} name${names.length === 1 ? "" : "s"} generated`;
  }

  function doGenerate() {
    const gender = genderEl.value;
    const style = styleEl.value;
    const count = parseInt(countEl.value, 10) || 12;
    const names = generate(count, gender, style);
    render(names);
  }

  generateBtn.addEventListener("click", doGenerate);

  resultsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-one");
    if (!btn) return;
    const name = btn.dataset.name;
    navigator.clipboard.writeText(name).then(() => {
      btn.textContent = "Copied";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("copied");
      }, 1500);
    });
  });

  copyAllBtn.addEventListener("click", () => {
    const cards = resultsEl.querySelectorAll(".name-card");
    const text = Array.from(cards)
      .map((c) => c.dataset.name)
      .join("\n");
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copyAllBtn.textContent = "Copied all";
      copyAllBtn.classList.add("copied");
      setTimeout(() => {
        copyAllBtn.textContent = "Copy all";
        copyAllBtn.classList.remove("copied");
      }, 1500);
    });
  });

  // Initial generate
  doGenerate();
})();
