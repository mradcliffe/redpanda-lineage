/*
    Layout functionality for doing CSS and JS conditionals of panda families
    displayed on the search results pages. A layout object should exist for each 
    panda we work with, so there's no global version of this.
    
    Optimize for the amount of screen space used, clarity in unordered-list
    logical ordering (by birthday), and for unambiguousness in vertical list
    order (no 2x2 lists)
*/

var Layout = {};   /* Namespace */

Layout.L = {};   /* Prototype */

Layout.init = function(family, info, parents, litter, siblings, children) {
    var layout = Object.create(Layout.L);
    // Set up item counts, since this is easier than pulling them from HTML.
    // Either both parents are displayed (one as undefined), or neither.
    if ((info.dad != undefined) || (info.mom != undefined)) {
        layout.num.parents = 2;
    }
    layout.num.litter = info.litter.length;
    layout.num.siblings = info.siblings.length;
    layout.num.children = info.children.length;
    // Make sure checks can see this object's counts
    layout.checks.num = layout.num;
    // Set up the divs themselves
    layout.family = family;
    layout.parents = parents;
    layout.litter = litter;
    layout.siblings = siblings;
    layout.children = children;
    return layout;
}

Layout.L.num = {};
Layout.L.num.parents = 0;
Layout.L.num.litter = 0;
Layout.L.num.siblings = 0;
Layout.L.num.children = 0;

Layout.L.family = undefined;   /* Output of this layout tool */
Layout.L.parents = undefined;
Layout.L.litter = undefined;
Layout.L.siblings = undefined;
Layout.L.children = undefined;

Layout.L.arrangements = {};
// TOWRITE: define arrangements here, instead of nesting them in the generate.layout.
// Include column swaps, tr swaps, and things in these functions.

Layout.L.checks = {};
// If children and siblings within one animal difference of each other in size,
// return true. Ignore lists longer than a mobile page height in length (7 or greater)
Layout.L.checks.balancedChildrenAndSiblings = function() {
  var difference = this.num.siblings - this.num.children;
  return ((this.between(difference, -1, 1, "inclusive")) &&
          (this.num.siblings < 7) && (this.num.chidren < 7));
}
Layout.L.checks.between = function(test, a, b, mode) {
  if (mode == "exclusive") {
    return (test > a) && (test < b);
  } else if (mode == "left inclusive") {
    return (test >= a) && (test < b);
  } else if (mode == "right inclusive") {
    return (test > a) && (test <= b);
  } else {   // Inclusive
    return (test >= a) && (test <= b);
  }
}
Layout.L.checks.litterExists = function() {
  return this.num.litter > 0;
}
// Five or more children, and no other litter/children
Layout.L.checks.manyChildrenNoSiblings = function() {
  return ((this.num.children >= 5) && (this.num.litter == 0) &&
          (this.num.siblings == 0));
}
// Five or more siblings, and no other litter/children
Layout.L.checks.manySiblingsNoChildren = function() {
  return ((this.num.siblings >= 5) && (this.num.litter == 0) &&
          (this.num.children == 0));
}
Layout.L.checks.onlyChildrenNotSiblings = function() {
  return (this.num.children > 0) && (this.num.siblings == 0);
}
Layout.L.checks.onlyLitterNotOthers = function() {
  return ((this.num.parents == 0) && (this.num.litter > 0) &&
          (this.num.siblings == 0) && (this.num.children == 0));
}
Layout.L.checks.onlyParentsNotOthers = function() {
  return ((this.num.parents > 0) && (this.num.litter == 0) && 
          (this.num.siblings == 0) && (this.num.children == 0));
}
Layout.L.checks.onlySiblingsNotChildren = function() {
  return (this.num.siblings > 0) && (this.num.children == 0);
}
// If no litter, but at least one siblings and children column plus parents, return true
Layout.L.checks.parentsButNoLitter = function() {
  return ((this.num.parents > 0) && (this.num.litter == 0) &&
          ((this.num.siblings > 0) || (this.num.children > 0)));
}
// If we have twice as many children as siblings, factor=2 will return true
Layout.L.checks.ratioChildrenToSiblings = function(factor) {
  var ctos = this.num.children / this.num.siblings;
  var stoc = this.num.siblings / this.num.children;
  return (ctos >= factor) || (stoc >= factor);
}
Layout.L.checks.singleChildrenOrSiblingsList = function() {
  return ((this.onlyChildrenNotSiblings()) || this.onlySiblingsNotChildren());
}
// Have only a single column of at least five children or five siblings.
Layout.L.checks.singleLongChildrenOrSiblingsList = function() {
  return ((this.manyChildrenNoSiblings()) || (this.manySiblingsNoChildren()));
}
// Have only a single column of less than five children or five siblings
Layout.L.checks.singleShortChildrenOrSiblingsList = function() {
  return ((this.onlyOneOfSiblingsOrChildrenLists()) && 
          (this.num.children < 5) && (this.num.siblings < 5));
}
// Determine if in mobile/portrait mode for layout tasks
Layout.L.checks.smallScreen = function() {
  return (window.matchMedia("(max-width: 670px)").matches == true);
}
Layout.L.checks.twoShortChildrenAndSiblingsLists = function() {
  return (this.between(this.num.children, 2, 5, "inclusive") &&
          this.between(this.num.siblings, 2, 5, "inclusive"));
}
Layout.L.checks.twoLongChildrenAndSiblingsLists = function() {
  return (this.num.siblings >= 6) && (this.num.children >= 6);
}
/* More generic checks */
// True if all lists in the input set have no members
Layout.L.checks.emptyLists = function(lists) {
  return lists.map(list_name => this.num[list_name] == 0).indexOf(false) == - 1;
}
// Choose a list, and ensure that no other lists have members
Layout.L.checks.onlyThisListHasMembers = function(list_name) {
  var other_lists = Object.keys(this.num).filter(i => i != list_name);
  return ((this.num[list_name] != 0) && (this.emptyLists(other_lists)));
}


Layout.L.div = {}
// Distance in list-count since the last divider. When this gets to two,
// or after a flat element, a divider should be added
Layout.L.div.distance = 0;
// Modal check to add a divider to the layout flow.
// May be true/false, or an mobileOnly options
Layout.L.div.divider = false;
// Flex box order. Determines display groupings.
// Increment whenever we plan on making a new row.
Layout.L.div.order = 0;

// Adds a divider if necessary. The "divider" value doubles as a flag to 
// describe whether or not flex dividers are necessary, so filter out 
// boolean "true" and "false" as class names
Layout.L.div.addFlexDivider = function(mainDiv) {
  // Increment distance when considering whether a divider should be added.
  // On mobile, dividers must be added after every 2nd list at least.
  if (this.divider == false) {
    this.distance++;
    if (this.distance == 2) {
      this.divider = "onlyMobile";
    }
  }
  if (this.divider != false) {
    var breaker = document.createElement('hr');
    breaker.className = "flexDivider";
    if ((this.divider != false) && (this.divider != true)) {
      breaker.classList.add(this.divider);
    }
    mainDiv.appendChild(breaker);
    this.distance = 0;
  }
  // Reset divider and distance settings
  if (this.distance == 0) {
    this.divider = false;
  }
}

// Clear state after doing a layout operation
Layout.L.div.clear = function() {
  Layout.L.div.distance = 0;
  Layout.L.div.divider = false;
  Layout.L.div.order = 0;
}

/* Take a div list, and apply flatten classes to it. When adding a flattened class,
   we need to add a line-break entity afterwards, and bump the flex box display
   order of subsequent inserted divs. */
Layout.L.div.flatten = function(div, onlyMobile=false) {
  if (onlyMobile == true) {
    div.childNodes[1].classList.add("onlyMobileFlat");
    div.style.order = this.order++;
    this.divider = "onlyMobile";
  } else {
    // Mobile and Desktop flattened divs generally only appear alone, so give
    // them a 100%-width singleton entry into the family list.
    div.classList.add("singleton");
    div.childNodes[1].classList.add("flat");
  }
  return div;
}

/* Take a div list, and apply a column-mode class to it. */
Layout.L.div.multiColumn = function(div, columnCount=2) {
  if (columnCount == 2) {
    div.childNodes[1].classList.add("double");
    div.style.order = this.order++;
  }
  if (columnCount == 3) {
    div.childNodes[1].classList.add("triple");
    div.style.order = this.order++;
  }
  return div;
}

/* Swap the target column with the destination column. On mobile, include logic
   that pushes the swapped column up to be even with the swapped column. */
Layout.L.div.swapColumn = function(target, destination, destination_cnt) {
  var tmp_order = destination.style.order + 1;
  target.style.order = tmp_order;
  // Take the sibling column height, subtract 90 for the parents div (always 3*30px),
  // and move the litter column up accordingly. Estimate the height since it's not rendered yet
  height = (destination_cnt + 1) * 30;
  shift = (height * -1) + 90;
  if (shift < 0) {   // Only move sibling up if we have space to move it up
    target.style.marginTop = shift.toString() + "px";
    target.classList.add("adjustedMarginTop");
  }
  // When doing a swap, move the line break element that might exist after the target, to
  // after the swapped destination instead.
  var divBreak = target.nextSibling;
  target.parentNode.removeChild(divBreak);
  target.parentNode.insertBefore(divBreak, destination.nextSibling);
}

/* For a single list, run through the relevant layout rules */
Layout.L.layoutList = function(list_div, list_name, list_count) {
  if ((list_div == undefined) || (list_count == 0)) {
    return;
  }
  var default_order = ["parents", "litter", "siblings", "children"];
  // Just this column, and it's short? Make it flat on desktop and mobile
  if (this.checks.onlyThisListHasMembers(list_name) && list_count == 2) {
    list_div = this.div.flatten(list_div, onlyMobile=false);
  }
  // TODO: If a single short column after a long column, swap them.
  // TODO: If a single other column exists with x > 6 items, flatten on mobile
  // TODO: If three columns, and one is long, swap non-parent column with the longer one
}

/* The layout generator basically prods all the possible arrangements of 
   parents/litter/siblings/children, and based on hand-layout-optimizing, chooses
   what the best layout should be for each possible set of inputs. */
Layout.L.layoutFamily = function() {
  // Parent layout logic
  if (this.parents != undefined) {
    this.parents.style.order = this.div.order;
    // Just parents? Make it flat on desktop and mobile
    if (this.checks.onlyParentsNotOthers()) {
      this.parents = this.div.flatten(this.parents, onlyMobile=false);
    }
    // If small number of siblings or children
    if (this.checks.manyChildrenNoSiblings() || this.checks.manySiblingsNoChildren()) {
      this.parents = this.div.flatten(this.parents, onlyMobile=true);
    }
    // If no litter column on mobile, and five or more children or siblings, 
    // flatten the parents before doing others
    if (this.checks.parentsButNoLitter() && this.checks.singleLongChildrenOrSiblingsList()) {
      this.parents = this.div.flatten(this.parents, onlyMobile=true);
    }
    // If no litter column, and two short columns of children and siblings, 
    // flatten the parents before doing others
    if (this.checks.parentsButNoLitter() && this.checks.twoShortChildrenAndSiblingsLists()) {
      this.parents = this.div.flatten(this.parents, onlyMobile=true);
    }
    // Append parents div to the family display
    this.family.appendChild(this.parents);
    // Add dividers as instructed by earlier layout checks
    this.div.addFlexDivider(this.family);
  }

  // Litter layout logic
  if (this.litter != undefined) {
    this.litter.style.order = this.div.order;
    // Only a litter div of two entries, and no others. Make it flat on desktop and mobile
    if (this.checks.onlyLitterNotOthers()) {
      this.litter = this.div.flatten(this.litter, onlyMobile=false);
    }
    // Append litter div to the family display
    this.family.appendChild(this.litter);
    // Add dividers as instructed by earlier layout checks.
    this.div.addFlexDivider(this.family);
  }

  // Siblings layout logic
  if (this.siblings != undefined) {
    this.siblings.style.order = this.div.order;
    // Spread out the siblings column if we have space
    if (this.checks.manySiblingsNoChildren()) {
      this.siblings = this.div.multiColumn(this.siblings, 2);
    }
    // Append siblings div to the family display
    this.family.appendChild(this.siblings);
    // If litter is much shorter than siblings on mobile, apply ordering to change display.
    // This is only done once so it won't work when changing orientations in Web Inspector.
    // TODO: make an event to do column switching live on demand
    if ((this.checks.litterExists()) && this.checks.onlySiblingsNotChildren() && this.checks.smallScreen()) {
      this.div.swapColumn(this.litter, this.siblings, this.num.siblings);
    }
    // Add dividers as instructed by earlier layout checks. If it's two columns since a
    // break was added, add another one.
    this.div.addFlexDivider(this.family);
  }

  // Children layout logic
  if (this.children != undefined) {
    this.children.style.order = this.div.order;
    // Spread out the children column if we have space
    if (this.checks.manyChildrenNoSiblings()) {
      this.children = this.div.multiColumn(this.children, 2);
    }
    // Append children div to the family display
    this.family.appendChild(this.children);
    // No more dividers to add after children
    // If litter is much shorter than children on mobile, apply ordering to change display.
    // This is only done once so it won't work when changing orientations in Web Inspector.
    // TODO: make an event to do column switching live on demand
    if ((this.checks.litterExists()) && this.checks.onlyChildrenNotSiblings() && this.checks.smallScreen()) {
      this.div.swapColumn(this.litter, this.children, this.num.children);
    }
  }
  this.div.clear();   // Clear historical values for future layout calls
  return this.family;
}

var mobile = window.matchMedia("(max-width: 670px)");
var last_offset = {};
mobile.addListener(function(e) {
  var columns = document.getElementsByClassName("adjustedMarginTop");
  if (e.matches == false) {
    for (col of columns) {
      last_offset[col.style.className] = col.style.marginTop;
      col.style.marginTop = "0px";
    }
  } else {
    for (col of columns) {
      col.style.marginTop = last_offset[col.style.className];
    }
  }
});
