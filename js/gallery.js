/*
   Operations and state related to photo galleries.

   This class, given a list of photos, will create many types of photo galleries --
   single frame ones with dogear navigation widgets and swipe controls, as well as 
   larger page-long galleries.

   The Gallery instance has two types of methods: photo methods (for dealing with
   single-photo panda info), and media methods (for dealing with photos with multiple
   pandas).
*/

Gallery = {};     /* Namespace */

Gallery.G = {};   /* Prototype */

Gallery.init = function(info, carousel_type, fallback_url='images/no-panda-portrait.jpg') {
  var gallery = Object.create(Gallery.G);
  gallery.info = info;   // Old photo value == info.photo
  // Hacky way to determine the proper element class from whether this
  // is an animal photo carousel or a zoo photo carousel
  gallery.carousel_type = carousel_type;
  if (carousel_type == "animal") {
    gallery.element_class = "pandaPhoto";
  } else if (carousel_type == "zoo") {
    gallery.element_class = "zooPhoto";
  } else {
    gallery.element_class = "pandaPhoto";
  }
  // Define index value for which of an animal's photos we'll display by default.
  // Doesn't apply to zoo info objects, so we have a default standby value
  if ("photo_index" in gallery.info) {
    gallery.index = gallery.info.photo_index;
  } else {
    gallery.index = "1";
  }
  // Galleries need unique IDs, in case somehow the same animal appears twice in
  // output results for a page.
  gallery.unique = Math.random().toString(36).slice(2);
  gallery.fallback_url = fallback_url;
  return gallery;
}

// If the media exists for an entity, display it. If it's missing,
// display a placeholder empty frame that takes up the same amount
// of space on the page. Support using class variables by default, but
// allow the photoSwap function to use unique parameters as it needs.
Gallery.G.displayPhoto = function(url=this.info.photo, id=this.info.id, index=this.index) {
  var image = document.createElement('img');
  if (url == undefined) {
    image.src = this.fallback_url;
  } else if (id.indexOf("_") != -1) {
    // HACK: passing carousel id from touch handlers
    image.src = url;
    image.id = id + "/photo/" + index;
    image.className = id + "/photo";
  } else {
    image.src = url;
    image.id = this.unique + "_" + id + "/photo/" + index;   // For carousel
    image.className = this.unique + "_" + id + "/photo";
  }
  image.onerror = "this.src='" + this.fallback_url + "'";
  var div = document.createElement('div');
  div.className = this.element_class;
  div.appendChild(image);
  // Preload the next and previous images to avoid double-reflow problems
  if (this.element_class == "pandaPhoto") {
    var preloads = this.displayPhotoPreload(id, index);
    for (var preload of preloads) {
      var pre_img = document.createElement('img');
      pre_img.className = "pandaPhoto preload";
      pre_img.src = preload;
      div.appendChild(pre_img);
    }
  }
  // Return the new div
  Touch.addHandler(image);
  return div;
}

// The hover over or swipe menu for photo navigation
// Need ids defined outside of this.info due ot inner function scope
Gallery.G.displayPhotoNavigation = function() {
  var that = this;   // Function scoping
  var span_link = document.createElement('a');
  span_link.className = "navigatorLink";
  span_link.id = that.unique + "_" + that.info.id + "/navigator";
  span_link.href = "javascript:;";
  var span = document.createElement('span');
  span.className = "navigator";
  // Clickable dogears when you have a carousel of more than one photo
  if (this.photoCount() < 2) {
      span.innerText = L.emoji.no_more;
      // Consistent widget behavior on mouse clicks for non-functional
      // navigators as well (disable normal right/middle click behavior)
      span_link.addEventListener('contextmenu', function(e) {   // Right click event
        e.preventDefault();   // Prevent normal context menu from firing
      });
      span_link.addEventListener('auxclick', function(e) {   // Middle click event
        if (e.which == 2) {
          e.preventDefault();   // Prevent middle click opening a new tab
        }
      });
  } else {
    span.innerText = that.index;
    span_link.addEventListener('click', function() {  // Left click event
      that.photoNext(that.info.id);
      Gallery.condenseDogEar(span);
      window.dispatchEvent(Page.profile.qr_update);
    });
    span_link.addEventListener('contextmenu', function(e) {   // Right click event
      e.preventDefault();   // Prevent normal context menu from firing
      that.photoPrevious(that.info.id);
      Gallery.condenseDogEar(span);
      window.dispatchEvent(Page.profile.qr_update);
    });
    span_link.addEventListener('auxclick', function(e) {   // Middle click event
      if (e.which == 2) {
        e.preventDefault();   // Prevent middle click opening a new tab
        that.photoRandom(that.info.id);
        Gallery.condenseDogEar(span);
        window.dispatchEvent(Page.profile.qr_update);
      }
    });
  }
  span_link.appendChild(span);
  Gallery.condenseDogEar(span);   // More than three digits?
  return span_link;
}
  
// Preload one photo ahead, and one photo behind, into the page without displaying them. 
// This makes it so that only a single page reflow occurs when navigating images.
Gallery.G.displayPhotoPreload = function() {
  var imgs = [];
  var default_photo = Pandas.def.animal["photo.1"];
  var prev_photo = "photo." + (parseInt(this.index) - 1).toString();
  var next_photo = "photo." + (parseInt(this.index) + 1).toString();
  var count = this.photoCount();
  var last_photo = "photo." + count.toString();
  var entity = this.photoEntity();
  if (Pandas.field(entity, prev_photo, this.carousel_type) != default_photo) {
    imgs.push(entity[prev_photo]);
  } else {
    imgs.push(entity[last_photo]);  // Before first item is the last photo in the list
  }
  if (Pandas.field(entity, next_photo, this.carousel_type) != default_photo) {
    imgs.push(entity[next_photo]);
  } else {
    imgs.push(entity["photo.1"]);  // After last item is back to the first
  }
  // If any of the photos we tried to preload are undefined, remove them from the preload list
  return imgs.filter(function(element) {
    return element !== undefined;
  });
}

// Utility function to get the current number of photos.
Gallery.G.photoCount = function() {
  var entity = this.photoEntity();
  var photo_manifest = Pandas.photoManifest(entity, this.carousel_type);
  var max_index = Object.values(photo_manifest).length;
  return max_index;
}

// Utility function to get the proper entity for photo counts
Gallery.G.photoEntity = function(entity_id=this.info.id) {
  var entity = undefined;
  if (this.carousel_type == "zoo") {
    entity = Pandas.searchZooId(entity_id)[0];
  } else {
    entity = Pandas.searchPandaId(entity_id)[0];
  }
  return entity;
}

// Navigation input event -- load the next photo in the carousel
Gallery.G.photoNext = function(entity_id=this.info.id) {
  // HACK: from touch handlers, it has a carousel id
  var carousel_id = entity_id;
  if (entity_id.indexOf("_") == -1) {
    carousel_id = this.unique + "_" + entity_id;
  }
  var current_photo_element = document.getElementsByClassName(carousel_id + "/photo")[0];
  var current_photo_id = current_photo_element.id.split("/")[2];
  this.photoSwap(current_photo_element, parseInt(current_photo_id) + 1);
}

// Navigation input event -- load the previous photo in the carousel
Gallery.G.photoPrevious = function(entity_id=this.info.id) {
  // HACK: from touch handlers, it has a carousel id
  var carousel_id = entity_id;
  if (entity_id.indexOf("_") == -1) {
    carousel_id = this.unique + "_" + entity_id;
  }
  var current_photo_element = document.getElementsByClassName(carousel_id + "/photo")[0];
  var current_photo_id = current_photo_element.id.split("/")[2];
  this.photoSwap(current_photo_element, parseInt(current_photo_id) - 1);
}

// Navigation input event -- load a random photo of this animal in the carousel
Gallery.G.photoRandom = function(entity_id=this.info.id) {
  // HACK: from touch handlers, it has a carousel id
  var carousel_id = entity_id;
  if (entity_id.indexOf("_") == -1) {
    carousel_id = this.unique + "_" + entity_id;
  } else {
    entity_id = carousel_id.split("_").pop();
  }
  var current_photo_element = document.getElementsByClassName(carousel_id + "/photo")[0];
  var current_photo_id = current_photo_element.id.split("/")[2];
  // Randomly choose the next id
  var photo_indexes = Object.keys(
    Pandas.photoManifest(Pandas.searchPandaId(entity_id)[0], "animal"))
      .map(x => x.split(".")[1]);
  var next_id = current_photo_id;
  if (photo_indexes.length > 1) {
    while (next_id == current_photo_id) {
      next_id = Pandas.randomChoice(photo_indexes, 1);
    }
  }
  this.photoSwap(current_photo_element, parseInt(next_id));
}

// Switch the currently displayed photo to the next one in the list
Gallery.G.photoSwap = function(photo, desired_index) {
  var span_link = photo.parentNode.childNodes[photo.parentNode.childNodes.length - 1];
  var [carousel_id, _, photo_id] = photo.id.split("/");
  var entity_id = carousel_id.split("_").pop();
  var entity = this.photoEntity(entity_id);
  var photo_manifest = Pandas.photoManifest(entity, this.carousel_type);
  var max_index = Object.values(photo_manifest).length;
  var new_index = 1;   // Fallback value
  if (desired_index < 1) {
    new_index = max_index;
  } else if (desired_index > max_index) {
    new_index = (desired_index % max_index);
  } else {
    var new_index = desired_index;
  }
  // Replace the span navigation id if we have an actual carousel
  if (max_index > 1) {
    span_link.childNodes[0].innerText = new_index.toString();
  } else {
    return;  // No carousel, no need to actually swap photos
  }
  var chosen = "photo." + new_index.toString();
  var new_choice = photo_manifest[chosen];
  var new_container = this.displayPhoto(new_choice, carousel_id, new_index.toString());
  var new_photo = new_container.childNodes[0];
  // Update existing photo element with info from the frame we switched to
  photo.src = new_photo.src;
  photo.id = new_photo.id;
  photo.className = new_photo.className;
  Touch.addHandler(new_photo);
  var photo_info = Pandas.profilePhoto(entity, new_index, this.carousel_type);
  // Replace the animal credit info
  this.singlePhotoCredit(photo_info, photo_id, new_index);
  // And the photographer credit's apple points
  this.userApplePoints(photo_info, photo_id, new_index);
}

// Replace the photographer's credit info for a panda's photo
Gallery.G.singlePhotoCredit = function(photo_info, current_index, new_index) {
  var animal_id = photo_info.id;
  var credit_link = document.getElementById(animal_id + "/author/" + current_index);
  credit_link.id = animal_id + "/author/" + new_index;
  if (Object.keys(Pandas.def.authors).indexOf(photo_info.credit) == -1) {
    credit_link.href = photo_info["link"];
  } else {
    credit_link.removeAttribute("href");   // No more link
  }
  credit_link.target = "_blank";   // Open in new tab
  credit_link.innerText = L.emoji.camera + " " + photo_info["credit"];
}

// Replace the photographer's apple points (number of photos on the site)
Gallery.G.userApplePoints = function(photo_info, current_index, new_index) {
  var animal_id = photo_info.id;
  var apple_link = document.getElementById(animal_id + "/counts/" + current_index);
  apple_link.id = animal_id + "/counts/" + new_index;
  if (Object.keys(Pandas.def.authors).indexOf(photo_info.credit) == -1) {
    apple_link.href = "#credit/" + photo_info["credit"];
    apple_link.innerText = L.emoji.gift + " " + P.db._photo.credit[photo_info["credit"]];
  } else {
    apple_link.innerText = "";
  }
}

/*
    Standalone gallery/photo construction methods
*/
// Create a profile page frame for a single animal, give it a nametag, and
// additionally, give it a relationship value.
Gallery.familyProfilePhoto = function(animal, chosen_photo, language, relationship, frame_class, multiple=false) {
  var info = Show.acquirePandaInfo(animal, language);
  // The overall container
  var container = document.createElement('div');
  container.className = "photoSample";
  if (frame_class != undefined) {
    container.classList.add(frame_class);
  }
  // Photo container
  var clickable_photo = document.createElement('a');
  clickable_photo.target = "_blank";
  if (chosen_photo != Pandas.def.animal["photo.1"]) {   // No link if no photo defined
    clickable_photo.href = chosen_photo["photo"].replace("media/?size=m", "");   // Instagram hack
  } 
  var image = document.createElement('img');
  image.src = chosen_photo["photo"];
  clickable_photo.appendChild(image);
  container.appendChild(clickable_photo);
  // Family name caption
  var animal_name = document.createElement('a');
  animal_name.href = "#profile/" + animal["_id"];
  var animal_text = document.createElement('h5');
  animal_text.className = "caption familyName";
  animal_text.innerText = info["name"];
  animal_name.appendChild(animal_text);
  animal_name.addEventListener("click", Show.button.top.action);
  container.appendChild(animal_name);
  // Family title caption.
  if (relationship != undefined) {
    var animal_relation = document.createElement('a');
    animal_relation.href = "#profile/" + animal["_id"];
    var relation_text = document.createElement('h5');
    relation_text.className = "caption familyTitle";
    var gender = Show.genderAnimal(animal, language, "caption gender");
    relation_text.appendChild(gender);
    // Span text can be cinched/tightened if too wide
    var span = document.createElement('span');
    var text = document.createTextNode(relationship);
    // TODO: cinch for any strings longer than X characters
    // TODO: cinch/make text smaller if also emojis exist
    if (relationship == L.gui.quadruplet["en"]) {
      span.classList.add("condensed");
    }
    span.appendChild(text);
    relation_text.appendChild(span);
    // Emoji separation not cinched
    var emojis = "";
    if (relationship == L.gui.me[language]) {
      emojis = "\u200A" + L.emoji.profile;
    }
    if (multiple == true) {
      emojis = L.emoji.question;
    }
    if (animal["death"] != undefined) {
      emojis = emojis + "\u200A" + L.emoji.died;
    }
    var emoji_text = document.createTextNode(emojis);
    relation_text.appendChild(emoji_text);
    animal_relation.appendChild(relation_text);
    animal_relation.addEventListener("click", Show.button.top.action);
    container.appendChild(animal_relation);  
  }
  return container;
}

// Take a dogear and change the style based on how large the inner number is
Gallery.condenseDogEar = function(nav) {
  // If more than three digits occur on click / mutate
  if (nav.innerText.length > 2) {
    nav.classList.add("threeDigits");
  } else {
    nav.classList.remove("threeDigits");
  }
}

// For a panda's birthday, grab a handful of photos (3 by default).
// Display a birthday header above the photos and credit messages below each one.
Gallery.birthdayPhotoCredits = function(language, photo_count=3) {
  var birthday_div = document.createElement('div');
  // Pandas must be alive, and have at least 5 photos
  var birthday_animals = Pandas.searchBirthday(true, 3);
  for (let animal of birthday_animals) {
    var info = Show.acquirePandaInfo(animal, language);
    var years_old = Pandas.ageYears(animal);
    // Post the birthday message (with age in years)
    var message = Message.birthday(info.name, info.id, years_old, language);
    birthday_div.appendChild(message);
    var photos = Pandas.searchPhotoTags([animal], ["portrait"], "photos", "first");
    for (let photo of Pandas.randomChoice(photos, photo_count)) {
      var img_link = document.createElement('a');
      // Link to the original instagram media
      img_link.href = "#panda/" + animal._id + "/photo/" + photo["photo.index"];
      var img = document.createElement('img');
      img.src = photo["photo"];
      img.src = img.src.replace('/?size=l', '/?size=m');
      img_link.appendChild(img);
      // Link to the original instagram media
      var caption_link = document.createElement('a');
      caption_link.href = photo["photo.link"];
      caption_link.href = caption_link.href.replace("/media/?size=m", "/");
      caption_link.href = caption_link.href.replace("/media/?size=l", "/");
      caption_link.target = "_blank";   // Open in new tab
      var caption = document.createElement('h5');
      caption.className = "caption birthdayMessage";
      var caption_span = document.createElement('span');
      caption_span.innerText = Language.L.emoji.camera + " " + photo["photo.author"];
      // TODO: condenser
      caption.appendChild(caption_span);
      caption_link.appendChild(caption);
      var container = document.createElement('div');
      container.className = "photoSample quarterPage";
      container.appendChild(img_link);
      container.appendChild(caption_link);
      birthday_div.appendChild(container);
    }
  }
  return birthday_div;
}

// Take pandaPhotoCredits and zooPhotoCredits, and interleave them as results.
Gallery.creditPhotos = function(results, language, max_hits) {
  var photo_results = Gallery.creditPhotosPage(0, results, language, max_hits);
  var content_divs = photo_results["output"];
  var photo_count = photo_results["hit_count"];
  // Write some HTML with summary information for the user and the number of photos
  var header = Message.credit(results["subject"], photo_count, language);
  content_divs.unshift(header);
  return content_divs;
}

// Use a page counter to determine where in the results count to start showing photos.
// If photos on this page < max_hits, hide the next page button
// TODO: zooPhotoCredits and pandaPhotoCredits shouldn't return divs yet, to prevent
// loading the entire image set each time you only want (set/N) images
Gallery.creditPhotosPage = function(page, results, language, max_hits) {
  var grab_photos = [];
  var content_photos = [];
  var content_divs = [];
  var initial_max_hits = max_hits;
  // We must unspool the results because each entity we query here can have multiple
  // results returned, and the paging must only return the first max_hits content.
  for (let entity of results["hits"]) {
    if (entity["_id"] < 0) {
      grab_photos = grab_photos.concat(Gallery.zooPhotoCredits(entity, results["subject"], language));
    } else {
      grab_photos = grab_photos.concat(Gallery.pandaPhotoCredits(entity, results["subject"], language));
    }
  }
  var starting_point = page * Query.env.paging.results_count;
  // Working copy of photo set, starting at the nth page of photos
  var content_photos = grab_photos.slice(starting_point);
  var hit_count = content_photos.length;
  if (page == 0 && Query.env.paging.shown_pages > 1) {
    // Refresh, but show more than just the normal photo_count
    max_hits = Query.env.paging.shown_pages * max_hits;
  }
  if (hit_count <= max_hits) {
    // Last page of content. Hide Next button
    Query.env.paging.display_button = false;
  } else {
    // Limit to just photo_count of the output
    content_photos = content_photos.slice(0, max_hits);
    // Set callbacks for next button, and redraw footer
    Query.env.paging.callback.function = Gallery.creditPhotosPage;
    Query.env.paging.callback.arguments = [
      page + 1,
      results,
      language,
      initial_max_hits,
    ];
    Query.env.paging.callback.frame_id = "contentFrame";
  }
  // Take the desired content_photos and convert them to divs
  content_photos.forEach(function(photo) {
    if (photo["type"] == "panda") {
      content_divs = content_divs.concat(Gallery.pandaPhotoCreditSingle(photo));
    }
    if (photo["type"] == "zoo") {
      content_divs = content_divs.concat(Gallery.zooPhotoCreditSingle(photo));
    }
  });
  // Redraw footer to update the paging button
  Page.footer.redraw("results");
  return {
    "output": content_divs,
    "hit_count": grab_photos.length
  }
}

// Get media photos (of two or more animals), which include a particular animal.
// Return a set of divs that includes both images and the titles for each image.
Gallery.groupPhotos = function(id_list) {
  var seen = {};
  var photo_list = [];
  for (let id of id_list) {
    var entities = Pandas.searchPandaMedia(id, only_media=true);
    for (let entity of entities) {
      var photos = Pandas.photoManifest(entity);
      for (let photo_key in photos) {
        var url = photos[photo_key];
        if (seen[url] == true) {
          continue;   // Skip photos we've already trakced
        } else {
          seen[url] = true;
          photo_list.push({
            "entity": entity,
            "photo_key": photo_key,
            "url": url
          });
        }
      }
    }
  }
  var output = Pandas.shuffleWithSeed(photo_list, Query.env.paging.seed);
  return output;
}

// Get the Nth page of group photos. Since we don't have a ton of group photos in general,
// I figure this is OK to write in terms of the older groupPhotos which parses all photos
// and writes name tags and such.
Gallery.groupPhotosPage = function(page, id_list, photo_count) {
  var initial_photo_count = photo_count;
  if (page == 0 && Query.env.paging.shown_pages > 1) { 
    // Refresh, but show more than just the normal photo_count
    photo_count = Query.env.paging.shown_pages * photo_count;
  }
  var photos = Gallery.groupPhotos(id_list);   // All photos
  var chosen = photos.slice(page * photo_count);   // Choose just this page
  if (chosen.length <= photo_count) {
    // Last page of content. Hide Next button
    Query.env.paging.display_button = false;
  } else {
    // Limit to just photo_count of the output
    chosen = chosen.slice(0, photo_count);
    Query.env.paging.callback.function = Gallery.groupPhotosPage;
    Query.env.paging.callback.arguments = [
      page + 1,
      id_list,
      initial_photo_count
    ];
    Query.env.paging.callback.frame_id = "contentFrame";
  }
  // Now that photos are whittled down, make divs
  var output = [];
  for (let shot of chosen) {
    var container = Gallery.groupPhotoSingle(shot["entity"], shot["photo_key"], shot["url"]);
    output.push(container);        
  }
  // Redraw the footer menu to update the paging button
  Page.footer.redraw("profile");
  return {
    "output": output
  }
}

Gallery.groupPhotosIntersect = function(id_list) {
  // Similar to groupPhotos, but each photo must have all animals
  // represented in the input id list.
  var output = [];
  var entities = Pandas.searchPandaMediaIntersect(id_list);
  for (let entity of entities) {
    var photos = Pandas.photoManifest(entity);
    for (let photo_key in photos) {
      output.push({
        "entity": entity,
        "photo_key": photo_key,
        "url": photos[photo_key]
      });
    }
  }
  return output;
}

Gallery.groupPhotosIntersectPage = function(page, id_list, photo_count) {
  // Clone of groupPhotosPage, with the constraint that all photos must
  // be of the entire list of animals in the id_list. Since this is a callback
  // I had to conform to the existing arity of the other functions, rather than
  // pass groupPhotosIntersect itself as a callback.
  var initial_photo_count = photo_count;
  if (page == 0 && Query.env.paging.shown_pages > 1) { 
    // Refresh, but show more than just the normal photo_count
    photo_count = Query.env.paging.shown_pages * photo_count;
  }
  var photos = Gallery.groupPhotosIntersect(id_list);   // All photos
  var chosen = photos.slice(page * photo_count);   // Choose just this page
  if (chosen.length <= photo_count) {
    // Last page of content. Hide Next button
    Query.env.paging.display_button = false;
  } else {
    // Limit to just photo_count of the output
    chosen = chosen.slice(0, photo_count);
    Query.env.paging.callback.function = Gallery.groupPhotosIntersectPage;
    Query.env.paging.callback.arguments = [
      page + 1,
      id_list,
      initial_photo_count
    ];
    Query.env.paging.callback.frame_id = "contentFrame";
  }
  // Now that photos are whittled down, make divs
  var output = [];
  for (let shot of chosen) {
    var container = Gallery.groupPhotoSingle(shot["entity"], shot["photo_key"], shot["url"]);
    output.push(container);        
  }
  // Redraw the footer menu to update the paging button
  Page.footer.redraw("profile");
  return {
    "output": output
  }
}

Gallery.groupPhotoSingle = function(entity, photo_key, url) {
  // TOWRITE: image styles based on url being medium or large
  var img_link = document.createElement('a');
  img_link.href = url;
  img_link.href = img_link.href.replace("/media/?size=m", "/");
  img_link.href = img_link.href.replace("/media/?size=l", "/");
  var img = document.createElement('img');
  img.src = url;
  img_link.appendChild(img);
  // Names of the group photos
  var caption_names = document.createElement('h5');
  caption_names.className = "caption groupMediaName";
  var caption_names_span = document.createElement('span');
  caption_names_span.innerText = Pandas.groupMediaCaption(entity, photo_key);
  caption_names.appendChild(caption_names_span);
  var caption_names_link = document.createElement('a');
  var panda_route = entity["panda.tags"].split(", ").join("/");
  caption_names_link.href = "#group/" + panda_route;
  caption_names_link.appendChild(caption_names);
  // Credit for the group photos
  var author = entity[photo_key + ".author"];
  var caption_credit_link = document.createElement('a');
  caption_credit_link.href = "#credit/" + author;   // build from author info
  var caption_credit = document.createElement('h5');
  caption_credit.className = "caption groupMediaAuthor";
  var caption_credit_span = document.createElement('span');
  caption_credit_span.innerText = Language.L.emoji.apple + " " + author;
  caption_credit.appendChild(caption_credit_span);
  caption_credit_link.appendChild(caption_credit);
  // Put it all in a frame
  var container = document.createElement('div');
  container.className = "photoSample";
  if ((url.indexOf("?size=l") != -1) && 
      (url.indexOf("instagram.com") != -1)) {
    container.classList.add("halfPage");
  } else if ((url.indexOf("?size=m") != -1) &&
              (url.indexOf("instagram.com") != -1)) {
    container.classList.add("quarterPage");
  } else if (url.indexOf("instagram.com") == -1) {
    container.classList.add("fullPage");   // self-hosted images
  } else {
    container.classList.add("quarterPage");
  }
  container.appendChild(img_link);
  container.appendChild(caption_names_link);
  container.appendChild(caption_credit_link);
  return container; 
}

// Solo photos that can be found in the group gallery. These are chosen on
// the basis of having the most tags, and are ideally interesting "action shots"
// of an individual animal.
Gallery.actionPhotos = function(language, id_list, photo_count=10) {
  return;   // TOWRITE
}

// Get lists of animals who died in the last two weeks.
// Return a div with the exact desired output.
Gallery.memorialPhotoCredits = function(language, id_list, photo_count=5) {
  var memorial_div = document.createElement('div');
  for (let id of id_list) {
    var animal = Pandas.searchPandaId(id)[0];
    var info = Show.acquirePandaInfo(animal, language);
    var message = Message.memorial(info.name, info.id, info.birthday, info.death, language);
    memorial_div.appendChild(message);
    var photos = Pandas.searchPhotoTags([animal], ["portrait"], "photos", "first");
    for (let photo of Pandas.randomChoice(photos, photo_count)) {
      var img_link = document.createElement('a');
      // Link to the original instagram media
      img_link.href = "#panda/" + animal._id + "/photo/" + photo["photo.index"];
      var img = document.createElement('img');
      img.src = photo["photo"];
      img.src = img.src.replace('/?size=l', '/?size=m');
      img_link.appendChild(img);
      // Link to the original instagram media
      var caption_link = document.createElement('a');
      caption_link.href = photo["photo.link"];
      caption_link.href = caption_link.href.replace("/media/?size=m", "/");
      caption_link.href = caption_link.href.replace("/media/?size=l", "/");
      caption_link.target = "_blank";   // Open in new tab
      var caption = document.createElement('h5');
      caption.className = "caption memorialMessage";
      var caption_span = document.createElement('span');
      caption_span.innerText = Language.L.emoji.camera + " " + photo["photo.author"];
      // TODO: condenser
      caption.appendChild(caption_span);
      caption_link.appendChild(caption);
      var container = document.createElement('div');
      container.className = "photoSample quarterPage";
      container.appendChild(img_link);
      container.appendChild(caption_link);
      memorial_div.appendChild(container);
    }
  }
  return memorial_div;
}

// Take an animal, and return a list of divs for all the photos of that animal
// that match the username that was searched. Used for making reports of all
// the photos in the website contributed by a single author.
Gallery.pandaPhotoCredits = function(animal, credit, language) {
  var photos = [];
  var photo_indexes = Pandas.photoGeneratorEntity;
  for (let field_name of photo_indexes(animal, 0)) {
    if (animal[field_name + ".author"] == credit) {
      photos.push({
        "id": animal["_id"],
        "image": animal[field_name], 
        "index": field_name,
        "type": "panda"}
      );
    }
  }
  return photos;
}

// Format a panda credit photo into displayable content
Gallery.pandaPhotoCreditSingle = function(item) {
  var photo = item.image;
  var index = item.index.split(".")[1];
  var img_link = document.createElement('a');
  var id = item.id;
  // Link to the original instagram media
  img_link.href = photo;
  img_link.href = img_link.href.replace("/media/?size=m", "/");
  img_link.href = img_link.href.replace("/media/?size=l", "/");
  img_link.target = "_blank";   // Open in new tab
  var img = document.createElement('img');
  img.src = photo;
  img.src = img.src.replace('/?size=m', '/?size=t');
  img.src = img.src.replace('/?size=l', '/?size=t');
  img_link.appendChild(img);
  var caption_link = document.createElement('a');
  // TODO: better handling of group photos
  if (id.indexOf("media.") != 0) {
    caption_link.href = "#panda/" + id + "/photo/" + index;
  }
  var caption = document.createElement('h5');
  caption.className = "caption";
  // TODO: handling of names of group pandas
  if (id.indexOf("media.") == 0) {
    var entity = Pandas.searchPandaId(id)[0];
    caption.innerText = Pandas.groupMediaCaption(entity, item.index);
    var panda_route = entity["panda.tags"].split(", ").join("/");
    caption_link.href = "#group/" + panda_route;
  } else {
    var animal = Pandas.searchPandaId(id)[0];
    var info = Show.acquirePandaInfo(animal, L.display);
    caption.innerText = info.name;
  }
  caption_link.appendChild(caption);
  var container = document.createElement('div');
  container.className = "photoSample";
  container.appendChild(img_link);
  container.appendChild(caption_link);
  return container;
}

// Display a gallery of photos with a given tag.
Gallery.tagPhotos = function(results, language, max_hits, add_emoji) {
  var page_results = results["hits"].slice();   // Working copy of photo set
  var hit_count = page_results.length;
  // Get the first page of content
  var paging_data = Gallery.tagPhotosPage(0, results, language, max_hits, add_emoji);
  var content_divs = paging_data["output"];
  // Build a summary message based on which tag_photo parser mode we have,
  // and whether we have hits or not.
  var header = Gallery.tagPhotoMessage(results, hit_count);
  content_divs.unshift(header);
  return content_divs;
}

// Use a page counter to determine where in the results count to start showing photos.
// If photos on this page < max_hits, hide the next page button
Gallery.tagPhotosPage = function(page, results, language, max_hits, add_emoji) {
  var content_divs = [];
  var initial_max_hits = max_hits;
  var starting_point = page * Query.env.paging.results_count;
  // Working copy of photo set, shuffled
  var page_results = results["hits"].slice();
  page_results = Pandas.shuffleWithSeed(results["hits"], Query.env.paging.seed);
  page_results = page_results.slice(starting_point);
  var hit_count = page_results.length;
  if (page == 0 && Query.env.paging.shown_pages > 1) {
    // Refresh, but show more than just the normal photo_count
    max_hits = Query.env.paging.shown_pages * max_hits;
  }
  if (hit_count <= max_hits) {
    // Last page of content. Hide Next button
    Query.env.paging.display_button = false;
  } else {
    // Limit to just photo_count of the output
    page_results = page_results.slice(0, max_hits);
    // Set callbacks for next button, and redraw footer
    Query.env.paging.callback.function = Gallery.tagPhotosPage;
    Query.env.paging.callback.arguments = [
      page + 1,
      results,
      language,
      initial_max_hits,
      add_emoji
    ];
    Query.env.paging.callback.frame_id = "contentFrame";
  }
  // Redraw footer to update the paging button
  Page.footer.redraw("results");
  for (let photo of page_results) {
    if (photo["photo.index"] != "0") {   // Not a null photo result
      content_divs = content_divs.concat(Gallery.tagPhotoSingle(photo, language, add_emoji));
    } else {
      page_results.pop(page_results.indexOf(photo));
    }
  }
  return {
    "output": content_divs
  }
}

// Logic to determine which message to display inside the photo gallery of tagged photos
Gallery.tagPhotoMessage = function(results, hit_count) {
  var header = undefined;
  if (hit_count == 0) {
    header = Show.emptyResult(L.messages.no_subject_tag_result, L.display);
  } else if ((results["parsed"] == "set_tag") ||
             (results["parsed"] == "set_tag_subject")) {
    var tag = results["tag"] != undefined ? results["tag"] : results["query"];
    var ctag = Language.tagPrimary(tag);
    header = Message.tag_subject(hit_count, results["subject"],
                                      Language.L.tags[ctag]["emoji"], 
                                      ctag, L.display);
  } else if (results["parsed"] == "set_baby_subject") {
    var tag = results["tag"] != undefined ? results["tag"] : results["query"];
    var ctag = Language.tagPrimary(tag);
    header = Message.tag_subject(hit_count, results["subject"],
                           Language.L.polyglots[ctag]["emoji"], 
                           ctag, L.display);
  } else if (results["parsed"] == "set_tag_intersection") {
    var tag = results["tag"] != undefined ? results["tag"] : results["query"];
    var emojis = tag.split(", ").map(tag => Language.L.tags[tag]["emoji"]);
    header = Message.tag_combo(hit_count, emojis, L.display);
  } else if (results["parsed"] == "set_tag_intersection_subject") {
    var tag = results["tag"] != undefined ? results["tag"] : results["query"];
    var emojis = tag.split(", ").map(tag => Language.L.tags[tag]["emoji"]);
    header = Message.tag_combo(hit_count, emojis, L.display);
  } else {
    header = Show.emptyResult(L.messages.no_subject_tag_result, L.display);
  }
  return header;
}

// Take a photo that matches a tag, and display it along with the tag emoji
Gallery.tagPhotoSingle = function(result, language, add_emoji) {
  var content_divs = [];
  var animal = Pandas.searchPandaId(result.id)[0];
  var info = Show.acquirePandaInfo(animal, language);
  var photo = result["photo"];
  var img_link = document.createElement('a');
  // Link to the original instagram media
  img_link.href = photo;
  img_link.href = img_link.href.replace("/media/?size=m", "/");
  img_link.href = img_link.href.replace("/media/?size=l", "/");
  img_link.target = "_blank";   // Open in new tab
  var img = document.createElement('img');
  img.src = photo;
  img.src = img.src.replace('/?size=m', '/?size=t');
  img.src = img.src.replace('/?size=l', '/?size=t');
  img_link.appendChild(img);
  var caption_link = document.createElement('a');
  // TODO: better handling of group photos
  if (animal._id.indexOf("media.") != 0) {
    caption_link.href = "#panda/" + animal._id + "/photo/" + result["photo.index"];
  }
  var caption = document.createElement('h5');
  caption.className = "caption";
  // TODO: handling of names of group pandas
  // TODO: support multiple tags
  if (animal._id.indexOf("media.") == 0) {
    caption.innerText = Pandas.groupMediaCaption(animal, "photo." + result["photo.index"]);
    var panda_route = animal["panda.tags"].split(", ").join("/");
    caption_link.href = "#group/" + panda_route;
  } else {
    caption.innerText = info.name;
  }
  // Prefix caption with an emoji if we can get one
  var tag_lookup = Language.L.tags[result["photo.tags"][0]];
  if ((tag_lookup != undefined) && (add_emoji == true)) {
    var emoji = tag_lookup["emoji"];
    caption.innerText = emoji + "\xa0" + caption.innerText;
  }
  caption_link.appendChild(caption);
  var container = document.createElement('div');
  container.className = "photoSample";
  container.appendChild(img_link);
  container.appendChild(caption_link);
  content_divs.push(container);
  return content_divs;
}

// Make a gallery out of newly added photos, for the front page.
// Choose some pandas from the list of updated photos at random.
Gallery.updatedNewPhotoCredits = function(language, photo_count=19) {
  var new_photos_div = document.createElement('div');
  var message = Message.new_photos(language);
  new_photos_div.appendChild(message);
  // Build a set of photos in the desired sort order: zoos, zoo(pandas),
  // new contributors, and finally new photos.
  var display_photos = Gallery.updatedPhotoOrdering(language, photo_count)
  for (let item of display_photos) {
    var photo = item.photo;
    var img_link = document.createElement('a');
    // Link to the original instagram media
    img_link.href = photo;
    img_link.href = img_link.href.replace("/media/?size=m", "/");
    img_link.href = img_link.href.replace("/media/?size=l", "/");
    img_link.target = "_blank";   // Open in new tab
    var img = document.createElement('img');
    img.src = photo;
    img.src = img.src.replace('/?size=m', '/?size=t');
    img.src = img.src.replace('/?size=l', '/?size=t');
    img_link.appendChild(img);
    var caption_link = document.createElement('a');
    // TODO: better handling of group photos
    if (item.id.indexOf("media.") != 0) {
      caption_link.href = "#panda/" + item.id + "/photo/" + item.index;
    }
    var caption = document.createElement('h5');
    caption.className = "caption updateName";
    if ("classes" in item) {
      // Color any zoo-related animals in the summary info
      for (let caption_class of item.classes) {
        caption.classList.add(caption_class);
      }
    }
    var animal = Pandas.searchPandaId(item.id)[0];
    var updateName = undefined;
    if (item.id.indexOf("media.") == 0) {
      updateName = Pandas.groupMediaCaption(animal, "photo." + item.index);
      var panda_route = animal["panda.tags"].split(", ").join("/");
      caption_link.href = "#group/" + panda_route;
  
    } else {
      var info = Show.acquirePandaInfo(animal, L.display);
      updateName = info.name;
    }
    if ("name_icon" in item) {
      updateName = item.name_icon + " " + updateName;
    }
    caption.innerText = updateName;
    var author = document.createElement('h5');
    author.className = "caption updateAuthor";
    var author_span = document.createElement('span');
    if ("credit_icon" in item) {
      author_span.innerText = item.credit_icon + "\xa0" + item.credit;
      caption.classList.add("newContributor");
    }
    else {
      author_span.innerText = Language.L.emoji.camera + "\xa0" + item.credit;
    }
    author.appendChild(author_span);
    caption_link.appendChild(caption);
    caption_link.appendChild(author);
    var container = document.createElement('div');
    container.className = "photoSample";
    container.appendChild(img_link);
    container.appendChild(caption_link);
    new_photos_div.appendChild(container);
  }
  return new_photos_div;
}

// Enforce the photo ordering for photos in the updates list, and select not the
// complete set of updates/pandas/zoos, but just a single photo for each one.
Gallery.updatedPhotoOrdering = function(language, photo_count) {
  // New zoo photos. Include only if there are current pandas at this zoo
  // that have at least one photo. Take no more zoo photos than we have
  // budgeted to show in this section
  var zoo_locators = P.db["_updates"].entities
    .filter(locator => locator.indexOf("zoo.") == 0);
  var zoo_photos = Pandas.unique(Pandas.locatorsToPhotos(zoo_locators), "id")
    .filter(function(photo) {
      var pandas = Pandas.searchPandaZoo(photo.id)
        .filter(panda => "photo.1" in panda);
      return pandas.length > 0;
    }).filter(function(photo) {
      return Object.keys(Pandas.def.authors).indexOf(photo.credit) == -1;
    });
  var zoo_chosen = Pandas.randomChoice(zoo_photos, photo_count);
  zoo_chosen = Pandas.sortPhotosByName(zoo_chosen, language + ".name");
  // Photos from new contributors just for pandas, not for zoos
  var author_locators = P.db["_updates"].authors;
  var author_photos_all = Pandas.locatorsToPhotos(author_locators)
    .filter(function(photo) {
      return Object.keys(Pandas.def.authors).indexOf(photo.credit) == -1;
    });
  var author_photos = Pandas.unique(author_photos_all, "id");
  var author_chosen = author_photos.slice();
  author_chosen = author_chosen.filter(photo => photo.type != "zoo");
  author_chosen = Pandas.randomChoice(author_chosen, photo_count);
  if (author_chosen.length > 10) {
    // If too many new people contributing photos, reduce down to one per contributor
    author_chosen = Pandas.unique(author_chosen, "credit");
  }
  author_chosen = Pandas.sortPhotosByName(author_chosen, language + ".name");
  // Photos of newly introduced pandas
  var new_panda_locators = P.db["_updates"].entities
    .filter(locator => locator.indexOf("panda.") == 0)
    .filter(locator => author_locators.indexOf(locator) == -1);
  var new_panda_photos = Pandas.unique(Pandas.locatorsToPhotos(new_panda_locators), "id")
    .filter(function(photo) {
      return Object.keys(Pandas.def.authors).indexOf(photo.credit) == -1;
    });
  var new_panda_chosen = Pandas.randomChoice(new_panda_photos, photo_count);
  new_panda_chosen = Pandas.sortPhotosByName(new_panda_chosen, language + ".name");
  // New pandas, or new panda group photos
  var panda_locators = P.db["_updates"].entities
    .filter(locator => zoo_locators.indexOf(locator) == -1);
  var panda_photos = Pandas.unique(Pandas.locatorsToPhotos(panda_locators), "id");
  // Remaining new photos for exisitng pandas. If any photo locators also describe 
  // a new author/new entity, only display those in their own section. Filter them out here.
  var update_locators = P.db["_updates"].photos
    .filter(locator => P.db["_updates"].entities.indexOf(locator) == -1)
    .filter(locator => P.db["_updates"].authors.indexOf(locator) == -1)
    .filter(locator => locator.indexOf("zoo.") == -1);
  var update_photos = Pandas.unique(Pandas.locatorsToPhotos(update_locators), "id")
    .filter(function(photo) {
      return Object.keys(Pandas.def.authors).indexOf(photo.credit) == -1;
    });
  // Now construct the list of photos. For each zoo in alphabetical order, find any
  // pandas in the panda list for that zoo, with priority to photos from new contributors.
  // Then display those pandas in alphabetical order. Once we're out of zoos and pandas,
  // display remaining new pandas from the update_photos list in alphabetical order.
  var output_photos = [];
  var all_zoo_pandas = [];
  var zoo_classes = ["one", "two", "three", "four"];
  var zoo_class_index = 0;
  for (let zoo_photo of zoo_chosen) {
    if (photo_count == 0) {
      return output_photos;
    }
    // New author added, so make sure it gets the giftwrap
    if (author_photos_all.map(photo => photo.credit).indexOf(zoo_photo.credit) != -1) {
      zoo_photo.credit_icon = Language.L.emoji.giftwrap;   // new panda and author!
    }
    // Give it giftwrap if only one photo attributed to this author
    if (P.db._photo.credit[zoo_photo.credit] == 1) {
      zoo_photo.credit_icon = Language.L.emoji.giftwrap;
    }
    var class_list = ["zoo", zoo_classes[zoo_class_index % zoo_classes.length]];
    zoo_photo.classes = class_list;
    output_photos.push(zoo_photo);
    // Display updated photos for animals at this zoo first
    var zoo_panda_ids = Pandas.searchPandaZoo(zoo_photo.id).map(panda => panda["_id"]);
    var zoo_pandas = author_photos.concat(panda_photos).concat(update_photos)
      .filter(panda => zoo_panda_ids.indexOf(panda.id) != -1);
    zoo_pandas = Pandas.unique(zoo_pandas, "id");
    zoo_pandas = Pandas.sortPhotosByName(zoo_pandas, language + ".name");
    for (let zoo_panda of zoo_pandas) {
      zoo_panda.name_icon = Language.L.emoji.profile;   // heart_panel
      if (author_photos_all.map(photo => photo.credit).indexOf(zoo_panda.credit) != -1) {
        zoo_panda.credit_icon = Language.L.emoji.giftwrap;   // new panda and author!
      }
      // Give it giftwrap if only one photo attributed to this author
      if (P.db._photo.credit[zoo_panda.credit] == 1) {
        zoo_panda.credit_icon = Language.L.emoji.giftwrap;
      }
      zoo_panda.classes = class_list;
      output_photos.push(zoo_panda);
      all_zoo_pandas.push(zoo_panda);
      photo_count = photo_count - 1;
    }
    photo_count = photo_count - 1;
    zoo_class_index = zoo_class_index + 1;
  }
  for (let author_photo of author_chosen) {
    if (photo_count == 0) {
      return output_photos;
    }
    var all_zoo_panda_ids = all_zoo_pandas.map(x => x.id);
    var author_photo_id = author_photo.id;
    if (all_zoo_panda_ids.indexOf(author_photo_id) != -1) {
      // Zoo pandas don't show in the new authors section
      continue;
    }
    // New panda added, so make sure it gets the heart icon
    if ((panda_photos.map(panda => panda.id).indexOf(author_photo.id) != -1) &&
        (author_photo.id.indexOf("media") == -1)) {
      author_photo.name_icon = Language.L.emoji.profile;
    }
    author_photo.credit_icon = Language.L.emoji.giftwrap;
    output_photos.push(author_photo);
    photo_count = photo_count - 1;
  }
  for (let new_panda_photo of new_panda_chosen) {
    if (photo_count == 0) {
      return output_photos;
    }
    var all_zoo_panda_ids = all_zoo_pandas.map(x => x.id);
    var new_panda_photo_id = new_panda_photo.id;
    if (all_zoo_panda_ids.indexOf(new_panda_photo_id) != -1) {
      // Zoo pandas don't show in the new authors section
      continue;
    }
    // New panda added, so make sure it gets the heart icon
    new_panda_photo.name_icon = Language.L.emoji.profile;
    output_photos.push(new_panda_photo);
    photo_count = photo_count - 1;
  }
  // If the author or entity photos have animals represented in the other update photos,
  // remove them from the update photos to get a broader set of animals shown.
  update_photos = update_photos.filter(photo => 
    author_photos.concat(panda_photos).map(others => others["id"])
    .indexOf(photo["id"]) == -1);
  var update_chosen = Pandas.randomChoice(update_photos, photo_count);
  update_chosen = Pandas.sortPhotosByName(update_chosen, language + ".name");
  for (let update_photo of update_chosen) {
    if (photo_count == 0) {
      return output_photos;
    }
    output_photos.push(update_photo);
    photo_count = photo_count - 1;
  }
  // If somehow we didn't exhaust the entire possible set of photos already
  return output_photos;
}

// Take a zoo, and return the photo. Assumes that you have a match
// that match the username that was searched. Used for making reports of all
// the photos in the website contributed by a single author.
Gallery.zooPhotoCredits = function(zoo, credit, language) {
  var photos = [];
  var photo_indexes = Pandas.photoGeneratorEntity;
  for (let field_name of photo_indexes(zoo, 0)) {
    if (zoo[field_name + ".author"] == credit) {
      photos.push({
        "id": zoo["_id"],
        "image": zoo[field_name],
        "index": field_name,
        "type": "zoo"});
    }
  }
  return photos;
}

Gallery.zooPhotoCreditSingle = function(item) {
  var photo = item.image;
  var index = item.index.split(".")[1];
  var img_link = document.createElement('a');
  var id = item.id;
  var entity = Pandas.searchZooId(id)[0];
  var info = Show.acquireZooInfo(entity, L.display);
  // Link to the original instagram media
  img_link.href = photo;
  img_link.href = img_link.href.replace("/media/?size=m", "/");
  img_link.href = img_link.href.replace("/media/?size=l", "/");
  img_link.target = "_blank";   // Open in new tab
  var img = document.createElement('img');
  img.src = photo;
  img.src = img.src.replace('/?size=m', '/?size=t');
  img.src = img.src.replace('/?size=l', '/?size=t');
  img_link.appendChild(img);
  var caption_link = document.createElement('a');
  caption_link.href = "#zoo/" + id + "/photo/" + index;
  var caption = document.createElement('h5');
  caption.className = "caption";
  caption.innerText = info.name;
  caption_link.appendChild(caption);
  var container = document.createElement('div');
  container.className = "photoSample";
  container.appendChild(img_link);
  container.appendChild(caption_link);
  return container;
}

Gallery.special = {};
Gallery.special.mothersday = {};
Gallery.special.mothersday.photos = [
  {
    "photo.1": ["media.7.gin-marumi", "photo.1"],
    "photo.1.format": "medium",
    "photo.1.message": {
      "en": "Marumi & Gin " + Language.L.emoji.mother,
      "jp": "円実, ギン" + Language.L.emoji.mother
    }
  },
  {
    "photo.2": ["media.7.gin-marumi", "photo.2"],
    "photo.2.format": "medium",
    "photo.2.message": {
      "en": "Gin " + Language.L.emoji.mother + " & Marumi",
      "jp": "ギン" + Language.L.emoji.mother + ", 円実"
    }
  },
  {
    "photo.3": ["media.26.hinata-kanta-yuri", "photo.1"],
    "photo.3.format": "large",
    "photo.3.message": {
      "en": "Yuri " + Language.L.emoji.mother + ", Kanta & Hinata",
      "jp": "百合" + Language.L.emoji.mother + ", カンタ, ヒナタ"
    }
  },
  {
    "photo.4": ["media.29.akachan-laila", "photo.1"],
    "photo.4.format": "medium",
    "photo.4.message": {
      "en": "Aka-chan & Laila " + Language.L.emoji.mother,
      "jp": "赤ちゃん, ライラ" + Language.L.emoji.mother
    }
  },
  {
    "photo.5": ["media.29.akachan-laila", "photo.2"],
    "photo.5.format": "medium",
    "photo.5.message": {
      "en": "Aka-chan & Laila " + Language.L.emoji.mother,
      "jp": "赤ちゃん, ライラ" + Language.L.emoji.mother    
    }
  },
  {
    "photo.6": ["media.7.gin-marumi", "photo.3"],
    "photo.6.format": "medium",
    "photo.6.message": {
      "en": "Gin " + Language.L.emoji.mother + " & Marumi",
      "jp": "ギン" + Language.L.emoji.mother + ", 円実"
    }
  },
  {
    "photo.7": ["media.7.gin-marumi", "photo.4"],
    "photo.7.format": "medium",
    "photo.7.message": {
      "en": "Marumi & Gin " + Language.L.emoji.mother,
      "jp": "円実, ギン" + Language.L.emoji.mother
    }
  },
  {
    "photo.8": ["media.36.jazz-minfa", "photo.1"],
    "photo.8.format": "large",
    "photo.8.message": {
      "en": "Min-fa " + Language.L.emoji.mother + " & Jazz",
      "jp": "ミンファ" + Language.L.emoji.mother + ", ジャズ"
    }
  },
  {
    "photo.9": ["media.41.nohana-nokaze", "photo.1"],
    "photo.9.format": "medium",
    "photo.9.message": {
      "en": "Nokaze " + Language.L.emoji.mother + " & Nohana",
      "jp": "野風" + Language.L.emoji.mother + ", 野花"
    }
  },
  {
    "photo.10": ["media.50.karin-luca", "photo.1"],
    "photo.10.format": "medium",
    "photo.10.message": {
      "en": "Luca & Karin " + Language.L.emoji.mother,
      "jp": "ルカ, カリン" + Language.L.emoji.mother
    }
  },
  {
    "photo.11": ["media.17.rifa-taofa", "photo.1"],
    "photo.11.format": "large",
    "photo.11.message": {
      "en": "Rifa & Taofa " + Language.L.emoji.mother,
      "jp": "李花, タオファ" + Language.L.emoji.mother
    }
  },
  {
    "photo.12": ["media.7.gin-marumi", "photo.5"],
    "photo.12.format": "medium",
    "photo.12.message": {
      "en": "Gin " + Language.L.emoji.mother + " & Marumi",
      "jp": "ギン" + Language.L.emoji.mother + ", 円実"
    }
  },
  {
    "photo.13": ["media.7.gin-marumi", "photo.6"],
    "photo.13.format": "medium",
    "photo.13.message": {
      "en": "Marumi & Gin " + Language.L.emoji.mother,
      "jp": "円実, ギン" + Language.L.emoji.mother
    }
  },
  {
    "photo.14": ["media.1.cocoa-milk-yuufa", "photo.1"],
    "photo.14.format": "medium",
    "photo.14.message": {
      "en": "Yuufa " + Language.L.emoji.mother + " & Milk & Cocoa",
      "jp": "優花" + Language.L.emoji.mother + ", ミルク, ココア"
    },
  },
  {
    "photo.15": ["media.1.himawari-yuufa", "photo.1"],
    "photo.15.format": "medium",
    "photo.15.message": {
      "en": "Himawari & Yuufa " + Language.L.emoji.mother,
      "jp": "ひまわり, 優花" + Language.L.emoji.mother
    }
  },
  {
    "photo.16": ["media.7.gin-marumi", "photo.7"],
    "photo.16.format": "large",
    "photo.16.message": {
      "en": "Marumi & Gin " + Language.L.emoji.mother,
      "jp": "円実, ギン"+ Language.L.emoji.mother
    }
  }
]
Gallery.special.mothersday.render = function() {
  // Iterate over Gallery.special.mothersday.photos.
  // Make large format ones with a different URI and class
  var counter = 0;
  var mothers_div = document.createElement('div');
  for (let photo_info of Gallery.special.mothersday.photos) {
    counter = counter + 1;
    var counter_string = "photo." + counter;
    var [graph_id, desired_photo] = photo_info[counter_string];
    var graph_node = Pandas.searchPandaId(graph_id)[0];
    var source = graph_node[desired_photo];
    var author = Language.L.emoji.camera + "\xa0" + graph_node[desired_photo + ".author"]
    var format = photo_info[counter_string + ".format"]
    var link = graph_node[desired_photo + ".link"]
    var message = photo_info["photo." + counter + ".message"][L.display];
    // Create the image frame
    var img_link = document.createElement('a');
    img_link.href = source;
    img_link.href = img_link.href.replace("/media/?size=m", "/");
    img_link.href = img_link.href.replace("/media/?size=l", "/");
    var img = document.createElement('img');
    // Instagram size change logic
    img.src = source;
    if (format == "large") {
      img.src = img.src.replace("/media/?size=m", "/media/?size=l");
    }
    img_link.appendChild(img);
    // Create the message caption
    var caption_message = document.createElement('a');
    var caption_message_text = document.createElement('h5');
    caption_message_text.className = "caption shortMessage";
    caption_message_text.innerText = message;
    caption_message.appendChild(caption_message_text);
    // Create the secondary credit caption
    var caption_author = document.createElement('a');
    caption_author.href = link;
    var caption_author_text = document.createElement('h5');
    caption_author_text.className = "caption authorCredit";
    caption_author_text.innerText = author;
    caption_author.appendChild(caption_author_text);
    // Create the entire photo frame
    var photo_frame = document.createElement('div');
    photo_frame.className = "photoSample";
    photo_frame.appendChild(img_link);
    photo_frame.appendChild(caption_message);
    photo_frame.appendChild(caption_author);
    if (format == "large") {
      photo_frame.classList.add("fullPage");
    } else {
      photo_frame.classList.add("halfPage");
    }
    // Append this to the Mother's day frame
    mothers_div.appendChild(photo_frame);
  }
  return mothers_div;
}
