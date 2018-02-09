
import { Handlebars } from 'lib';
import template from '../templates/dropdownButton.hbs';

export default Marionette.View.extend({
    initialize(options) {
        this.reqres = options.reqres;
    },

    className: 'input input_dropdown',

    template: Handlebars.compile(template),

    templateContext() {
        const value = this.model.get('value');
        const displayAttribute = this.model.get('displayAttribute');
        return {
            hasValue: Boolean(value),
            text: value ? _.result(value.toJSON(), displayAttribute) : null,
            allowEmptyValue: this.options.allowEmptyValue
        };
    },

    ui: {
        text: '.js-text'
    },

    events: {
        'click .js-clear-button': '__clear',
        click: '__click',
        focus: '__onFocus'
    },

    modelEvents: {
        'change:value': 'render'
    },

    __clear() {
        this.reqres.trigger('value:set', null);
        return false;
    },

    __click() {
        this.reqres.trigger('panel:open');
    },

    __onFocus() {
        this.trigger('focus');
    }
});
