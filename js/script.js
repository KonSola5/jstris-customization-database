let database;
/** @typedef {{date: (string | ""), name: (string | ""), author: (string | ""), size: (number | ""), link: string}} Skin */
/** @typedef {Object.<string, Skin[]>} Database */

class DatabaseManager {
  /** @type {Database} */
  database = {};
  /** @type {string[]} */
  categories = [];
  /** @type {Skin[]} */
  searchResults = [];
  /** @type {(HTMLLIElement | null)} */
  lastSelectedCategory = null;

  constructor(database) {
    this.database = database;
    this.categories = ["Search results"].concat(Object.keys(this.database));
    this.initCategories();
    this.switchCategory(1);
  }

  initCategories() {
    let self = this;
    let listItems = [];
    this.categories.forEach((category, index) => {
      let listItem = document.createElement("li");
      listItem.textContent = category;
      listItem.onclick = (event) => {
        if (self.lastSelectedCategory) self.lastSelectedCategory.classList.remove("selected");
        self.switchCategory(index);
        event.target.classList.add("selected");
        self.lastSelectedCategory = event.target;
      };
      listItems.push(listItem);
    });
    document.getElementById("game-list").replaceChildren(...listItems);
  }

  /** @param {number} categoryIndex */
  switchCategory(categoryIndex) {
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
}

fetch("jstrisCustomizationDatabase.json", { cache: "reload" })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
  })
  .then((json) => {
    database = new DatabaseManager(json);
  })
  .catch((error) => {
    console.error("An error occured:\n" + error);
  });
