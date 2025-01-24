/** @typedef {{date: (string | ""), name: (string | ""), author: (string | ""), size: (number | ""), link: string}} Skin */
/** @typedef {Object.<string, Skin[]>} Database */

class DatabaseManager {
  /** @type {Database} */
  database = {};
  /** @type {string[]} */
  categories = [];
  /** @type {HTMLLIElement[]} */
  categoryListItems = [];
  /** @type {Skin[]} */
  searchResults = [];
  /** @type {boolean} */
  searching = false;
  /** @type {(HTMLLIElement | null)} */
  lastSelectedCategory = null;

  constructor(database) {
    this.database = database;
    this.categories = ["Search results"].concat(Object.keys(this.database));
    this.initCategories();
    this.categoryListItems = document.getElementById("game-list").children;
    this.switchCategory(1);
  }

  initCategories() {
    let self = this;
    let listItems = [];
    this.categories.forEach((category, index) => {
      let listItem = document.createElement("li");
      listItem.textContent = category;
      listItem.onclick = (event) => self.switchCategory(index);
      listItems.push(listItem);
    });
    document.getElementById("game-list").replaceChildren(...listItems);
  }

  /** @param {number} categoryIndex */
  switchCategory(categoryIndex) {
    if (this.lastSelectedCategory) this.lastSelectedCategory.classList.remove("selected");
    this.categoryListItems[categoryIndex].classList.add("selected");
    this.lastSelectedCategory = this.categoryListItems[categoryIndex];

    document.getElementById("skin-list-title").textContent = this.categories[categoryIndex];

    let listToShow = categoryIndex === 0 ? this.searchResults : this.database[this.categories[categoryIndex]];
    let listItems = [];
    listToShow.forEach((skin) => {
      let listItem = document.createElement("li");
      // TODO: Make list items selectable
      let nameAndSkin = document.createElement("div");
      nameAndSkin.classList.add("name-and-skin");
      let moreInfo = document.createElement("div");
      moreInfo.classList.add("more-info");
      listItem.append(nameAndSkin, moreInfo);

      // Name and skin
      let name = document.createElement("span");
      name.classList.add("name");
      name.textContent = skin.name;
      let image = document.createElement("img");
      image.crossOrigin = "anonymous";
      image.loading = "lazy";
      image.src = skin.link;
      nameAndSkin.append(name, image);

      // More info
      let author = document.createElement("span");
      author.classList.add("author");
      author.textContent = skin.author;
      let badges = [];
      if (skin.badges) {
        skin.badges.forEach((badge) => {
          let badgeSpan = document.createElement("span");
          badgeSpan.classList.add("badge");
          switch (badge) {
            case "connected": {
              badgeSpan.classList.add("connected");
              badgeSpan.textContent = "Connected";
              break;
            }
            case "gif": {
              badgeSpan.classList.add("animated");
              badgeSpan.textContent = "GIF";
              break;
            }
            case "video": {
              badgeSpan.classList.add("animated");
              badgeSpan.textContent = "Video";
              break;
            }
            case "tintable": {
              badgeSpan.classList.add("tintable");
              badgeSpan.textContent = "Tintable";
              break;
            }
          }
          badges.push(badgeSpan);
        });
      }

      let size = document.createElement("span");
      size.classList.add("size");
      size.textContent = skin.size;

      moreInfo.append(author, ...badges, size);

      listItems.push(listItem);
    });

    document.getElementById("skin-list").replaceChildren(...listItems);
  }

  /** @param {string} query  */
  // async, because search may take some time
  async search(query) {
    if (this.searching) throw new Error("A search is currently ongoing.");

    this.searchResults = [];
    let searchResults = [];
    let splitQuery = query.split(" ");
    // case insensitive, user shouldn't be able to search by regex
    let regexes = splitQuery.map((word) => new RegExp(`(?:^|\\W)${word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}(?:$|\\W)`, "i"));

    this.searching = true;
    Object.keys(this.database).forEach((category) => {
      this.database[category].forEach((skin) => {
        let score = 0;
        regexes.forEach((regex) => {
          // TODO: Factor tags in and reward them with points towards sorting.
          if (regex.test(skin.name)) {
            score++;
            regex.lastIndex = 0;
          }
        });
        if (score > 0) {
          searchResults.push({ skin: skin, score: score });
        }
      });
    });

    // Sort by score, then alphabetically by name
    let collator = new Intl.Collator()
    searchResults.sort((skin1, skin2) => {
      let [score1, score2] = [skin1.score, skin2.score];
      let [name1, name2] = [skin1.skin.name, skin2.skin.name];
      if (score1 < score2) return 1;
      if (score1 > score2) return -1;
      if (score1 === score2) {
        return collator.compare(name1, name2);
      }
      return 0;
    });

    searchResults.forEach(result => {
      this.searchResults.push(result.skin)
    });

    this.searching = false;
  }
}

fetch("jstrisCustomizationDatabase.json", { cache: "reload" })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
  })
  .then((json) => {
    let database = new DatabaseManager(json);

    document.getElementById("search").addEventListener("submit", (event) => {
      let query = document.getElementById("search-input").value;
      
      database.search(query).then(() => {
        database.switchCategory(0);
      })

      event.preventDefault();
    })
  })
  .catch((error) => {
    console.error("An error occured:\n" + error);
  });
