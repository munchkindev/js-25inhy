// Import stylesheets
import './style.css';

// Write Javascript code!
class CarouselController {

  defaultSettings = {
      loop: true,
      delay: 8000,
      autoplay: true
  }

  /**
   * @@param {object} settings
   */
  constructor(settings) {
      this.carousel = settings.element;
      delete settings.element;

      this.current = 0;
      this.hooks = {};
      this.settings = settings;

      if (!this.carousel) {
          throw 'A carousel element is required. For example: new CarouselController({ element: document.getElementById(\'carousel\') })';
      }

      /**
       * Sanitize `loop` setting
       */
      this.addFilter('setting.loop', value => {
          return String(value).toLowerCase() === 'true';
      });

      /**
       * Sanitize `delay` setting
       */
      this.addFilter('setting.delay', value => parseInt(value));

      /**
       * Sanitize `autoplay` setting
       */
      this.addFilter('setting.autoplay', value => {
          return String(value).toLowerCase() === 'true';
      });

      // Autoplay on init.
      if (this.getSetting('autoplay')) {
          this.play();
      }
  }

  /**
   * Get the carousel container element.
   * @@returns {Element}
   */
  getCarousel() {
      return this.carousel;
  }

  /**
   * Get a setting value.
   * @@param {string} name
   * @@param defaultValue
   * @@returns {*}
   */
  getSetting(name, defaultValue) {
      if (!defaultValue && name in this.defaultSettings) {
          defaultValue = this.defaultSettings[name]
      }

      /**
       * Apply value filters.
       * @@example carousel.addFilter('setting.delay', function(value) { return value + 500; });
       */
      return this.applyFilters(`setting.${name}`, name in this.settings ? this.settings[name] : defaultValue);
  }

  /**
   * Get hooks by type and name. Ordered by priority.
   * @@param {string} type
   * @@param {string} name
   * @@returns {array}
   */
  getHooks(type, name) {
      let hooks = [];

      if (type in this.hooks) {
          let localHooks = this.hooks[type];
          localHooks = localHooks.filter(el => el.name === name);
          localHooks = localHooks.sort((a, b) => a.priority - b.priority);
          hooks = hooks.concat(localHooks);
      }

      return hooks;
  }

  /**
   * Add a hook.
   * @@param {string} type
   * @@param {object} hookMeta
   */
  addHook(type, hookMeta) {

      // Create new local hook type array.
      if (!(type in this.hooks)) {
          this.hooks[type] = [];
      }

      this.hooks[type].push(hookMeta);
  }

  /**
   * Add action listener.
   * @@param {string} action Name of action to trigger callback on.
   * @@param {function} callback
   * @@param {number} priority
   */
  addAction(action, callback, priority = 10) {
      this.addHook('actions', {
          name: action,
          callback: callback,
          priority: priority
      });
  }

  /**
   * Trigger an action.
   * @@param {string} name Name of action to run.
   * @@param {*} args Arguments passed to the callback function.
   */
  doAction(name, ...args) {
      this.getHooks('actions', name).forEach(hook => {
         hook.callback(...args);
      });
  }

  /**
   * Register filter.
   * @@param {string} filter Name of filter to trigger callback on.
   * @@param {function} callback
   * @@param {number} priority
   */
  addFilter(filter, callback, priority = 10) {
      this.addHook('filters', {
          name: filter,
          callback: callback,
          priority: priority
      });
  }

  /**
   * Apply all named filters to a value.
   * @@param {string} name Name of action to run.
   * @@param {*} value The value to be mutated.
   * @@param {*} args Arguments passed to the callback function.
   * @@returns {*}
   */
  applyFilters(name, value, ...args) {
      this.getHooks('filters', name).forEach(hook => {
          value = hook.callback(value, ...args);
      });

      return value;
  }

  /**
   * Get all the children (slides) elements.
   * @@returns {Element[]}
   */
  getSlides() {
      return Array.from(this.getCarousel().children);
  }

  /**
   * Get a specific slide by index.
   * @@param {int} index
   * @@returns {Element|null}
   */
  getSlide(index) {
      return this.getSlides()[index];
  }

  /**
   * Show a specific slide by index.
   * @@param {int} index
   * @@returns {int}
   */
  goTo(index) {
      const slides = this.getSlides();
      const slide = this.getSlide(index);

      if (slide) {
          slides.forEach((el) => {
              el.classList.remove('active');
          });

          slide.classList.add('active');

          this.current = slides.indexOf(slide);

          /**
           * Trigger goto event.
           * @@example carousel.addAction('goto', function(slide, index) { ... });
           */
          this.doAction('goto', slide, this.current);
      }

      return this.current;
  }

  /**
   * Show the next slide (if has one).
   */
  next() {
      let replay = false;

      // Check if carousel is looping through slides automatically.
      if (this.playing) {
          replay = true;
      }

      const slides = this.getSlides();
      let nextIndex = this.current + 1;

      // If the next slide is greater than the total, reset to 0 if looping else use -1 to stop `goTo` method.
      if (nextIndex > (slides.length - 1)) {
          if (this.getSetting('loop')) {
              nextIndex = 0;
          } else {
              nextIndex = -1;
          }
      }

      // Only go to slide if next index is valid.
      if (nextIndex >= 0) {
          this.goTo(nextIndex);

          // Continue with auto play.
          if (replay) {
              this.play();
          }
      }
  }

  /**
   * Show the previous slide (if has one).
   */
  previous() {
      let replay = false;

      // Check if carousel is looping through slides automatically.
      if (this.playing) {
          replay = true;
      }

      const slides = this.getSlides();
      let prevIndex = this.current - 1;

      // If the prev slide is less than 0, reset to the last slide if looping else use -1 to stop `goTo` method.
      if (prevIndex < 0) {
          if (this.getSetting('loop')) {
              prevIndex = slides.length - 1;
          } else {
              prevIndex = -1;
          }
      }

      // Only go to slide if next index is valid.
      if (prevIndex >= 0) {
          this.goTo(prevIndex);

          // Continue with auto play.
          if (replay) {
              this.play();
          }
      }
  }

  /**
   * Automatically go to the next slide (or start if loop is true).
   * @@returns {number}
   */
  play() {
      this.stop();

      this.goTo(this.current);

      this.playing = setInterval(() => {
          this.next();
      }, this.getSetting('delay'));

      return this.playing;
  }

  /**
   * Stop the automatic carousel if running.
   */
  stop() {
      if (this.playing) {
          clearInterval(this.playing);
      }
  }


}

/**
* Get the carousel container element.
* @@type {Element}
*/
const carouselContainer = document.querySelector('.carousel-container');

/**
* Create a new controller instance for our carousel.
* @@type {CarouselController}
*/
const carousel = new CarouselController({
  element: carouselContainer.querySelector('.carousel'),
  loop: true,
  delay: 8000,
  autoplay: true
});

/**
* Lazy load each image only when the slide is in view.
*/
carousel.addAction('goto', function(slide, index) {
  let images = [];

  if (slide.tagName.toLowerCase() === 'img') {
      images.push(slide);
  } else {
      images.concat(slide.querySelectorAll('img'));
  }

  images.forEach((img) => {
      if (!img.src && img.dataset.src) {
          img.src = img.dataset.src;
      }
  });
});

/**
* Show previous slide (if has one) when clicking previous button.
*/
document.querySelector('.carousel-prev').addEventListener('click', function(event) {
  event.preventDefault();
  carousel.previous();
});

/**
* Show next slide (if has one) when clicking next button.
*/
document.querySelector('.carousel-next').addEventListener('click', function(event) {
  event.preventDefault();
  carousel.next();
});

// this function scales the child in the parent container
function scale() {
  document.querySelectorAll('img.slide').forEach(scaled => {
      parent = scaled.parentNode,
      ratio = (parent.offsetWidth / scaled.offsetWidth),
      padding = scaled.offsetHeight * ratio;

    scaled.style.transform = 'scale(' + ratio + ')';
    scaled.style.transformOrigin = 'top left';

    parent.style.paddingTop = padding; // keeps the parent height in ratio to child resize
  })
}

scale();
window.onresize = scale();