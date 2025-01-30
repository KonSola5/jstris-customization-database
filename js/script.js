/** @typedef {{date: (string | ""), name: (string | ""), author: (string | ""), size: (number | ""), link: string, badges?: string[]}} Skin */
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
  /** @type {(HTMLLIElement | null)} */
  lastSelectedSkin = null;
  /** @type {{category: (number | null), index: (number | null), link: (string | null), connected: ("plus" | "extras" | null)}} */
  selectedSkin = {
    category: null,
    index: null,
    link: null,
    connected: null,
  };

  constructor(database) {
    this.database = database;
    this.categories = ["Search results"].concat(Object.keys(this.database));
    this.initCategories();
    this.categoryListItems = document.getElementById("game-list").children;
    this.switchCategory(1);
  }

  initCategories() {
    let listItems = [];
    this.categories.forEach((category, index) => {
      let listItem = document.createElement("li");
      listItem.tabIndex = 0;
      listItem.textContent = category;
      listItem.onclick = (event) => this.switchCategory(index);
      listItem.onkeydown = (event) => {
        if (event.code == "Enter" || event.code == "Space") {
          listItem.click();
          event.preventDefault();
        }
      };
      listItems.push(listItem);
    });
    document.getElementById("game-list").replaceChildren(...listItems);
  }

  /** @param {number} categoryIndex */
  switchCategory(categoryIndex) {
    if (this.lastSelectedCategory == categoryIndex) return;
    if (this.lastSelectedCategory) this.lastSelectedCategory.classList.remove("selected");
    this.categoryListItems[categoryIndex].classList.add("selected");
    this.lastSelectedCategory = this.categoryListItems[categoryIndex];

    if (categoryIndex === 0) {
      if (this.searchResults.length === 0) document.getElementById("no-results").classList.remove("hidden");
    } else document.getElementById("no-results").classList.add("hidden");

    document.getElementById("skin-list-title").textContent = this.categories[categoryIndex];

    let listToShow = categoryIndex === 0 ? this.searchResults : this.database[this.categories[categoryIndex]];
    let listItems = [];
    listToShow.forEach((skin, index) => {
      let listItem = document.createElement("li");
      listItem.dataset.index = index;
      listItem.tabIndex = 0;

      if (this.selectedSkin.category === categoryIndex && this.selectedSkin.index === index) {
        listItem.classList.add("selected");
      }
      listItem.onclick = (event) => {
        // TODO: Another way of selecting a skin to mitigate a search issue
        if (listItem.classList.contains("selected")) return;
        this.selectedSkin = {
          category: categoryIndex,
          index: index,
          link: skin.link,
          connected: null,
        };
        preview.changeSkin(skin.link, null);
        listItem.classList.add("selected");
        if (this.lastSelectedSkin) this.lastSelectedSkin.classList.remove("selected");
        this.lastSelectedSkin = listItem;
      };
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
          switch (badge.toLowerCase()) {
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
    let quoteCount = (query.match(/"/g) || []).length;
    if (quoteCount % 2 == 1) throw new Error("The search query contains an unmatched quotation mark.");
    let splitterRegex = /[^ "]*"[^"]*"|[^ ]+/g;
    let splitQuery = [];
    let results;
    while ((results = splitterRegex.exec(query)) !== null) {
      splitQuery.push(results[0]);
    }
    let terms = [],
      authors = [],
      types = [];
    let hasAuthors = false;
    let hasTypes = false;
    let hasTerms = false;
    splitQuery.forEach((word, i) => {
      if (word.startsWith("by:")) {
        authors.push(word.slice(3).replace(/"/g, ""));
        hasAuthors = true;
      } else if (word.startsWith("is:")) {
        types.push(word.slice(3).replace(/"/g, "").toLowerCase());
        hasTypes = true;
      } else {
        terms.push(word.replace(/"/g, ""));
        hasTerms = true;
      }
    });

    // case insensitive, user shouldn't be able to search by regex
    let termRegexes = terms.map(
      (word) => new RegExp(`(?:^|\\W)${word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}(?:$|\\W)`, "i")
    );
    let authorRegexes = authors.map(
      (word) => new RegExp(`(?:^|\\W)${word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}(?:$|\\W)`, "i")
    );

    this.searching = true;
    Object.keys(this.database).forEach((category) => {
      this.database[category].forEach((skin) => {
        let authorScore = 0,
          typeScore = 0,
          termScore = 0;
        authorRegexes.forEach((regex) => {
          if (regex.test(skin.author)) {
            authorScore++;
            regex.lastIndex = 0;
          }
        });
        types.forEach((type) => {
          if (skin.badges?.some((badge) => badge.toLowerCase() == type)) {
            typeScore++;
          }
        });
        termRegexes.forEach((regex) => {
          // TODO: Factor tags in and reward them with points towards sorting.
          if (regex.test(skin.name)) {
            termScore++;
            regex.lastIndex = 0;
          }
        });
        let shouldResult = false;
        if (hasAuthors && hasTypes) {
          if (authorScore > 0 && typeScore > 0) shouldResult = hasTerms ? termScore > 0 : true;
        } else {
          if (hasAuthors) {
            if (authorScore > 0) shouldResult = hasTerms ? termScore > 0 : true;
          } else if (hasTypes) {
            if (typeScore > 0) shouldResult = hasTerms ? termScore > 0 : true;
          } else {
            shouldResult = hasTerms ? termScore > 0 : false;
          }
        }
        if (shouldResult) {
          searchResults.push({ skin: skin, score: termScore });
        }
      });
    });

    // Sort by score, then alphabetically by name
    let collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    searchResults.sort((skin1, skin2) => {
      let [score1, score2] = [skin1.score, skin2.score];
      let [name1, name2] = [skin1.skin.name, skin2.skin.name];
      if (score1 < score2) return 1;
      if (score1 > score2) return -1;
      if (score1 === score2) return collator.compare(name1, name2);
      return 0;
    });

    searchResults.forEach((result) => {
      this.searchResults.push(result.skin);
    });

    if (this.searchResults.length === 0) document.getElementById("no-results").classList.remove("hidden");
    else document.getElementById("no-results").classList.add("hidden");

    this.searching = false;

    // Temporary search issue fix.
    this.selectedSkin = {
      category: null,
      index: null,
      link: null,
      connected: null,
    };
  }
}

class Preview {
  /** Contains an example board with PCO and two 4-high segments of garbage. */
  matrix = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 5, 2, 2, 2],
    [7, 1, 1, 0, 0, 0, 5, 2, 3, 3],
    [7, 7, 4, 4, 0, 0, 5, 6, 3, 3],
    [7, 4, 4, 0, 0, 0, 5, 6, 6, 6],
    [8, 8, 8, 8, 8, 8, 8, 8, 0, 8],
    [8, 8, 8, 8, 8, 8, 8, 8, 0, 8],
    [8, 8, 8, 8, 8, 8, 8, 8, 0, 8],
    [8, 8, 8, 8, 8, 8, 8, 8, 0, 8],
    [8, 8, 0, 8, 8, 8, 8, 8, 8, 8],
    [8, 8, 0, 8, 8, 8, 8, 8, 8, 8],
    [8, 8, 0, 8, 8, 8, 8, 8, 8, 8],
    [8, 8, 0, 8, 8, 8, 8, 8, 8, 8],
  ];

  /** Contains Jstris Extras connection data for the example matrix. */
  // prettier-ignore
  JEconnections = [
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [0,   0,   0,   0,   0,   0,   0,   0,   0,   0  ],
    [16,  72,  0,   0,   0,   0,   64,  80,  24,  8  ],
    [64,  18,  8,   0,   0,   0,   66,  2,   208, 104],
    [82,  8,   80,  8,   0,   0,   66,  64,  22,  11 ],
    [2,   16,  10,  0,   0,   0,   2,   18,  24,  8  ],
    [208, 248, 248, 248, 248, 248, 248, 104, 0,   64 ],
    [214, 255, 255, 255, 255, 255, 255, 107, 0,   66 ],
    [214, 255, 255, 255, 255, 255, 255, 107, 0,   66 ],
    [22,  31,  31,  31,  31,  31,  31,  11,  0,   2  ],
    [208, 104, 0,   208, 248, 248, 248, 248, 248, 104],
    [214, 107, 0,   214, 255, 255, 255, 255, 255, 107],
    [214, 107, 0,   214, 255, 255, 255, 255, 255, 107],
    [22,  11,  0,   22,  31,  31,  31,  31,  31,  11 ],
  ];

  colors = [
    undefined,
    "#D70F37",
    "#E35B02",
    "#E39F02",
    "#59B101",
    "#0F9BD7",
    "#2141C6",
    "#AF298A",
    "#999999",
    "#6A6A6A",
  ];
  skinOffsets = [undefined, 2, 3, 4, 5, 6, 7, 8, 1, 0];

  blockSize = 24;

  skinBlockSize = 24;
  /** @type {HTMLImageElement | OffscreenCanvas | HTMLCanvasElement | null} */
  selectedSkin = null;
  connectedMethod = null;

  /** @type {CanvasRenderingContext2D | null} */
  ctx;

  constructor() {
    this.ctx = document.getElementById("matrix").getContext("2d");
    this.redrawMatrix();
  }

  getConnection(connection) {
    const tileLookup = {
      0: [3, 3],
      2: [3, 2],
      8: [2, 3],
      10: [2, 6],
      11: [2, 2],
      16: [0, 3],
      18: [0, 6],
      22: [0, 2],
      24: [1, 3],
      26: [1, 6],
      27: [4, 3],
      30: [5, 1],
      31: [1, 2],
      64: [3, 0],
      66: [3, 1],
      72: [2, 4],
      74: [2, 5],
      75: [5, 0],
      80: [0, 4],
      82: [0, 5],
      86: [4, 2],
      88: [1, 4],
      90: [1, 5],
      91: [0, 7],
      94: [1, 7],
      95: [4, 4],
      104: [2, 0],
      106: [5, 3],
      107: [2, 1],
      120: [4, 0],
      122: [2, 7],
      123: [3, 5],
      126: [5, 7],
      127: [3, 4],
      208: [0, 0],
      210: [4, 1],
      214: [0, 1],
      216: [5, 2],
      218: [3, 7],
      219: [4, 7],
      222: [5, 5],
      223: [5, 4],
      248: [1, 0],
      250: [4, 6],
      251: [3, 6],
      254: [5, 6],
      255: [1, 1],
    };

    // Return the unused tile if it doesn't exist in the lookup table above.
    // It should not appear, if it appears, it's a bug.
    return tileLookup[connection] ?? [4, 5];
  }

  drawBlock(x, y, blockColor, connection) {
    // Default rendering method
    this.ctx.drawImage(
      /* Image         */ this.selectedSkin,
      /* Source X      */ this.skinOffsets[blockColor] * this.skinBlockSize,
      /* Source Y      */ 0,
      /* Source width  */ this.skinBlockSize,
      /* Source height */ this.skinBlockSize,
      /* Dest. X       */ x * this.blockSize,
      /* Dest. Y       */ y * this.blockSize,
      /* Dest. width   */ this.blockSize,
      /* Dest. height  */ this.blockSize
    );
  }

  redrawMatrix() {
    this.ctx.clearRect(0, 0, 242, 480);
    this.matrix.forEach((row, y) => {
      row.forEach((block, x) => {
        if (block !== 0) {
          if (this.selectedSkin == null) {
            this.ctx.fillStyle = this.colors[block];
            this.ctx.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
          } else {
            this.drawBlock(x, y, block);
          }
        }
      });
    });
  }

  changeSkin(url, connectedMethod) {
    if (url.slice(-4) == ".gif") {
      document.getElementById("preview-loading").classList.remove("hidden");
      this.gif = new GIF();
      this.gif.loadURL(url).then(() => {
        document.getElementById("preview-loading").classList.add("hidden");
        this.skinBlockSize = this.gif.width / 9;
        this.connectedMethod = connectedMethod;
        this.gif.onEachFrame((gifCanvas) => {
          this.selectedSkin = gifCanvas;
          this.redrawMatrix();
        });
      });
    } else {
      if (this.gif) this.gif.stop();
      this.gif = null;
      let skin = new Image();
      skin.crossOrigin = "anonymous";
      skin.src = url;
      skin.onload = (event) => {
        switch (connectedMethod) {
          // TODO: Jstris+ and Jstris Extras connected skins
          default: {
            this.skinBlockSize = skin.naturalWidth / 9;
            this.selectedSkin = skin;
            this.connectedMethod = connectedMethod;
            this.redrawMatrix();
          }
        }
      };
    }
  }
}
let preview = new Preview();
fetch("jstrisCustomizationDatabase.json", { cache: "reload" })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP error whilst loading the database: ${response.status}`);
    return response.json();
  })
  .then((json) => afterSuccessfulFetch(json))
  .catch((error) => {
    console.error("An error occured:\n" + error);
  });

function afterSuccessfulFetch(json) {
  let database = new DatabaseManager(json);
  document.getElementById("search").addEventListener("submit", (event) => {
    let query = document.getElementById("search-input").value;
    database.search(query).then(() => {
      database.switchCategory(0);
    });
    event.preventDefault();
  });
  document.getElementById("search").addEventListener("click", (event) => {
    document.getElementById("search-tooltip").classList.remove("hidden");
    document.getElementById("search-input").focus();
  });
  document.getElementById("search-input").addEventListener("blur", (event) => {
    document.getElementById("search-tooltip").classList.add("hidden");
  });
}

/**
 * Processes the GIF image and animates it on a canvas.
 * This is a singleton class - attempting to create another instance will return the first instance.
 *
 * Modified version of https://github.com/deanm/omggif/pull/31.
 */
class GIF {
  /** @type */
  reader;
  /** @type {OffscreenCanvas | HTMLCanvasElement} */
  canvas;
  /** @type {CanvasRenderingContext2D} */
  ctx;
  /** @type {number} */
  width;
  /** @type {number} */
  height;
  /** @type {number} */
  frameNumber;
  /** @type */
  previousFrameInfo;
  /** @type {ImageData} */
  previousImageData;
  /** @type {number} */
  loops;
  /** @type {number} */
  lastDelay = 0;
  /** @type {number} */
  animationHandle;
  /**
   * @type {number}
   * The initial timer of the animation.
   */
  t0;

  constructor() {
    // Sigleton, attempting to create another instance will return the same instance
    if (GIF._instance) return GIF._instance;
    GIF._instance = this;
  }

  async loadURL(url) {
    await fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error whilst loading GIF: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        let bytes = new Uint8Array(arrayBuffer);
        this.parseGIF(bytes);
      })
      .catch((error) => {
        console.error("An error occured:\n" + error);
      });
  }

  parseGIF(bytes) {
    this.reader = new GifReader(bytes);

    this.frameNumber = 0;
    this.loops = this.reader.loopCount();
    this.previousFrameInfo = null;
    this.t0 = document.timeline.currentTime;

    cancelAnimationFrame(this.animationHandle);
    if (!this.canvas) {
      if (!OffscreenCanvas) this.canvas = document.createElement("canvas");
      else this.canvas = new OffscreenCanvas(64 * 9, 64);
    }
    this.width = this.canvas.width = this.reader.width;
    this.height = this.canvas.height = this.reader.height;
    this.ctx = this.canvas.getContext("2d");
  }

  /**
   * @param {(gifCanvas: OffscreenCanvas | HTMLCanvasElement) => void} callback Exposes the internal GIF canvas of the current GIF frame.
   * @param {number} timestamp Current timestamp.
   */
  onEachFrame(callback = () => void 0, timestamp = document.timeline.currentTime) {
    if (timestamp - this.t0 >= this.lastDelay) {
      // Time to draw the next frame!
      if (!this.reader) return;

      if (this.frameNumber === this.reader.numFrames()) {
        this.frameNumber = 0;
        if (--this.loops === 0) return; // bail if we're on the last loop
      }

      let frameInfo = this.reader.frameInfo(this.frameNumber);

      if (this.frameNumber === 0) {
        // Always clear whole canvas on the first frame
        this.ctx.clearRect(0, 0, this.reader.width, this.reader.height);
      }

      if (this.previousFrameInfo) {
        switch (this.previousFrameInfo.disposal) {
          case 0:
            break; // "No disposal specified" - do nothing, we draw over the existing canvas
          case 1:
            break; // "Do not dispose" - do nothing, we draw over the existing canvas
          case 2:
            // "Restore to background" - browsers ignore background color, so
            // in practice it is always "Restore to transparent"
            this.ctx.clearRect(
              this.previousFrameInfo.x,
              this.previousFrameInfo.y,
              this.previousFrameInfo.width,
              this.previousFrameInfo.height
            );
            break;
          case 3:
            // "Restore to previous" - revert back to most recent frame that was
            // not set to "Restore to previous", or frame 0
            if (this.previousImageData) this.ctx.putImageData(previousImageData, 0, 0);
            break;
          default:
            console.error("Disposal method is unsupported");
        }
      }

      if (this.frameNumber === 0 || frameInfo.disposal < 2) {
        // save this frame in case we need to revert to it later
        this.previousImageData = this.ctx.getImageData(0, 0, this.reader.width, this.reader.height);
        this.previousImageData.frame = this.frameNumber;
      }

      // draw frame on top of existing canvas data
      let imageData = this.ctx.getImageData(0, 0, this.reader.width, this.reader.height);

      this.reader.decodeAndBlitFrameRGBA(this.frameNumber, imageData.data);
      this.ctx.putImageData(imageData, 0, 0, frameInfo.x, frameInfo.y, frameInfo.width, frameInfo.height);

      // get ready to draw next frame
      this.previousFrameInfo = frameInfo;
      this.frameNumber++;

      // If animation was paused, update last time to current time to prevent rubberbanding
      if (timestamp - this.t0 >= 2 * this.lastDelay) this.t0 = timestamp;
      // Else, add last delay
      else this.t0 = this.t0 + this.lastDelay;
      this.lastDelay = frameInfo.delay * 10;

      this.animationHandle = requestAnimationFrame((t) => this.onEachFrame(callback, t));

      callback(this.canvas);
    } else {
      // Not drawing the next frame yet.
      this.animationHandle = requestAnimationFrame((t) => this.onEachFrame(callback, t));
    }
  }

  stop() {
    cancelAnimationFrame(this.animationHandle);
  }
}
