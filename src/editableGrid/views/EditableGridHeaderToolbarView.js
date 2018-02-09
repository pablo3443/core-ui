
import template from '../templates/editableGridHeaderToolbar.hbs';

export default Marionette.View.extend({
    initialize(options) {
        this.allowDelete = options.allowDelete;
        this.allowCreate = options.allowCreate;
        this.selectedItems = [];
    },

    className: 'collection-header-btn dev-collection-header-btn',

    template: Handlebars.compile(template),

    ui: {
        create: '.js-header-action_create',
        delete: '.js-header-action_delete'
    },

    events: {
        'click @ui.create': '__handleCreate',
        'click @ui.delete': '__handleDelete'
    },

    updateViewState(selectedItems) {
        this.selectedItems = selectedItems;
        this.__toggleViewClasses();
    },

    onRender() {
        this.__toggleViewClasses();
        this.__updateToolbar();
    },

    __handleCreate() {
        this.trigger('toolbar:execute:action', 'create');
    },

    __handleDelete() {
        if (!this.__getDeleteDisabled()) {
            this.trigger('toolbar:execute:action', 'delete');
        }
    },

    __toggleViewClasses() {
        this.ui.delete.toggleClass('disabled', this.__getDeleteDisabled());
    },

    __updateToolbar() {
        if (!this.allowCreate) {
            this.ui.create.hide();
        }
        if (_.isBoolean(this.allowDelete) && !this.allowDelete) {
            this.ui.delete.hide();
        }
    },

    __getDeleteDisabled() {
        let result = false;
        if (this.selectedItems.length === 0) {
            return true;
        }

        if (_.isFunction(this.allowDelete)) {
            this.selectedItems.forEach(item => result = result || !this.allowDelete(item));
        }

        return result;
    }
});

