import template from './templates/dateTimeEditor.hbs';
import DateTimeService from './services/DateTimeService';
import BaseEditorView from './base/BaseEditorView';
import formRepository from '../formRepository';
import iconWrapRemove from './iconsWraps/iconWrapRemove.html';
import iconWrapDate from './iconsWraps/iconWrapDate.html';
import iconWrapTime from './iconsWraps/iconWrapTime.html';
import DatePanelView from './impl/dateTime/views/DatePanelView';
import DateInputView from './impl/dateTime/views/DateInputView';
import dropdown from 'dropdown';
import { dateHelpers, keyCode } from 'utils';
import GlobalEventService from '../../services/GlobalEventService';
import DurationEditorView from './DurationEditorView';
import { getClasses } from './impl/dateTime/meta';
import MobileService from 'services/MobileService';
import { Duration, DateTime } from 'luxon';
import Marionette from 'backbone.marionette';

const defaultOptions = () => ({
    allowEmptyValue: true,
    dateDisplayFormat: dateHelpers.getFormat('dateISO'),
    timeDisplayFormat: undefined,
    showTitle: true,
    showDate: true,
    showTime: true,
    allFocusableParts: {
        maxLength: 2,
        text: ':'
    },
    seconds: {
        text: ''
    }
});

const defaultClasses = 'editor editor_date-time dropdown_root';

const editorTypes = {
    dateTime: 'dateTime',
    date: 'date',
    time: 'time'
};

/**
 * @name DateTimeEditorView
 * @memberof module:core.form.editors
 * @class Combined date and time editor. Supported data type: <code>String</code> in ISO8601 format
 * (for example, '2015-07-20T10:46:37Z').
 * @extends module:core.form.editors.base.BaseEditorView
 * @param {Object} options Options object.
 * All the properties of {@link module:core.form.editors.base.BaseEditorView BaseEditorView} class are also supported.
 * @param {Boolean} [options.allowEmptyValue=true] - Whether to display a delete button that sets the value to <code>null</code>.
 * E.g. for UTC+3 enter <code>180</code>. Negative values allowed. Defaults to browser timezone offset.
 * @param {String} [options.dateDisplayFormat=null] - A [MomentJS](http://momentjs.com/docs/#/displaying/format/) format string (e.g. 'M/D/YYYY' etc.).
 * @param {String} [options.timeDisplayFormat=null] - A [MomentJS](http://momentjs.com/docs/#/displaying/format/) format string (e.g. 'LTS' etc.).
 * @param {Boolean} {options.showTitle=true} Whether to show title attribute.
 * @param {Object} [allFocusableParts] Params for time editor's part. Like Duration Editor Options.
 * @param {Object} [days, minutes, hours, seconds] Params for time editor's part. Like Duration Editor Options.
 * */

export default formRepository.editors.DateTime = BaseEditorView.extend({
    initialize(options = {}) {
        this.__applyOptions(options, defaultOptions);
        this.value = this.__adjustValue(this.value);
        this.editorType = this.options.showDate
            ? this.options.showTime
                ? editorTypes.dateTime
                : editorTypes.date
            : this.options.showTime
            ? editorTypes.time
            : console.warn('DateTimeEditor: showDate and showTime is false');
    },

    ui: {
        clearButton: '.js-clear-button',
        mobileInput: '.js-mobile-input'
    },

    events() {
        const events = {
            'click @ui.clearButton': '__onClear',
            mouseenter: '__onMouseenter'
        };
        if (MobileService.isMobile) {
            const mobileEvents = {
                'input @ui.mobileInput': '__onMobileInput',
                click: '__onClickMobileMode'
            };

            Object.assign(events, mobileEvents);
        }
        return events;
    },

    __onClickMobileMode(event, inner) {
        if (inner || !this.getEditable()) {
            return;
        }
        this.__openNativePicker();
    },

    regions: {
        timeDropdownRegion: {
            el: '.js-time-dropdown-region',
            replaceElement: true
        },
        dateDropdownRegion: {
            el: '.js-date-dropdown-region',
            replaceElement: true
        }
    },

    className() {
        this.displayClasses = getClasses();

        return this.__getClassName();
    },

    template: Handlebars.compile(template),

    templateContext() {
        const mobileInputType = {
            [editorTypes.dateTime]: 'datetime-local',
            [editorTypes.date]: 'date',
            [editorTypes.time]: 'time'
        };

        return _.defaultsPure(
            {
                isMobile: MobileService.isMobile,
                mobileInputType: mobileInputType[this.editorType]
            },
            this.options
        );
    },

    setValue(value: String, { updateButtons = true, triggerChange = false } = {}): void {
        this.__value(value, updateButtons, triggerChange);
    },

    getValue(): string {
        return this.__adjustValue(this.value);
    },

    onRender(): void {
        this.__updateClearButton();
        this.__presentView();
    },

    onAttach() {
        if (MobileService.isMobile) {
            this.timeDropdownView?.ui.input[0].setAttribute('readonly', '');
            this.calendarDropdownView?.ui.input[0].setAttribute('readonly', '');

            this.__setValueToMobileInput(this.value);
        }
    },

    __setValueToMobileInput(value) {
        const nativeFormats = {
            [editorTypes.dateTime]: 'YYYY-MM-DDTHH:mm',
            [editorTypes.date]: 'YYYY-MM-DD',
            [editorTypes.time]: 'HH:mm'
        };

        this.ui.mobileInput[0].value = value ? DateTime.fromISO(value).toFormat(nativeFormats[this.editorType]) : null;
    },

    focusElement: null,

    focus(): void {
        if (this.options.showDate) {
            this.calendarDropdownView?.focus();
        } else if (this.options.showTime) {
            this.timeDropdownView?.focus();
        }
    },

    blur(): void {
        this.options.showDate && this.__dateBlur();
        this.options.showTime && this.__timeBlur();
    },

    setFormat(newFormat) {
        if (typeof newFormat !== 'object' || newFormat === null) {
            return;
        }
        this.options.dateDisplayFormat = newFormat.dateDisplayFormat;
        this.options.timeDisplayFormat = newFormat.timeDisplayFormat;

        this.options.showDate = !!this.options.dateDisplayFormat;
        this.options.showTime = !!this.options.timeDisplayFormat;

        this.__presentView();

        this.$editorEl.attr('class', this.__getClassName());
    },

    __onMobileInput(event) {
        const input = event.target;
        const value = input.value;

        this.setValue(this.__mapNativeToValue(value), { updateButtons: true, triggerChange: true });
    },

    __mapNativeToValue(value: string) {
        if (!value) {
            return null;
        }
        if (this.options.showDate) {
            return DateTime.fromISO(value).toISO();
        } else if (this.options.showTime) {
            const parsedTime = value.split(':');
            const hour = Number(parsedTime[0]);
            const minute = Number(parsedTime[1]);

            return DateTime.fromISO(this.value || undefined)
                .set({
                    hour,
                    minute,
                    second: 0,
                    millisecond: 0
                })
                .toISO();
        }
    },

    __dateButtonInputKeydown(buttonView, event) {
        switch (event.keyCode) {
            case keyCode.DELETE:
            case keyCode.BACKSPACE:
                this.calendarDropdownView.close();
                return;
            case keyCode.F2:
                this.__toggleCalendarPicker();
                return;
            case keyCode.ENTER:
                this.__triggerChange();
                this.__toggleCalendarPicker();
                return;
            case keyCode.TAB:
                // if tab go to time input(default browser behavior),
                // not trigger tab on parent grid.
                if (!event.shiftKey) {
                    event.stopPropagation();
                }
                return;
            default:
                break;
        }

        if (!this.calendarDropdownView.isOpen) {
            return;
        }

        let newValue;
        const oldValue = this.value === null ? undefined : this.value;
        switch (event.keyCode) {
            case keyCode.UP:
                newValue = event.shiftKey ? DateTime.fromISO(oldValue).plus({ years: 1 }) : DateTime.fromISO(oldValue).minus({ weeks: 1 });
                break;
            case keyCode.DOWN:
                newValue = event.shiftKey ? DateTime.fromISO(oldValue).minus({ years: 1 }) : DateTime.fromISO(oldValue).plus({ weeks: 1 });
                break;
            case keyCode.LEFT:
                newValue = event.shiftKey ? DateTime.fromISO(oldValue).minus({ months: 1 }) : DateTime.fromISO(oldValue).minus({ days: 1 });
                break;
            case keyCode.RIGHT:
                newValue = event.shiftKey ? DateTime.fromISO(oldValue).plus({ months: 1 }) : DateTime.fromISO(oldValue).plus({ days: 1 });
                break;
            default:
                return;
        }

        const amountMilliseconds = newValue.valueOf();

        this.__value(amountMilliseconds, true, false);

        this.__updatePickerDate(amountMilliseconds);
    },

    __timeButtonInputKeydown(event) {
        switch (event.keyCode) {
            case keyCode.TAB:
                // if tab go to date input(default browser behavior),
                // not trigger tab on parent grid.
                if (event.shiftKey) {
                    event.stopPropagation();
                }
                break;
            default:
                break;
        }
    },

    __updatePickerDate(date) {
        if (this.calendarDropdownView.isOpen) {
            this.calendarDropdownView.panelView?.updatePickerDate(date);
        }
    },

    __toggleCalendarPicker() {
        if (this.calendarDropdownView.isOpen) {
            this.calendarDropdownView.close();
        } else {
            this.__openCalendarPicker();
        }
    },

    __updateClearButton(): void {
        if (!this.options.allowEmptyValue || !this.getValue()) {
            this.ui.clearButton.hide();
        } else {
            this.ui.clearButton.show();
        }
    },

    __value(newValue, updateButtons, triggerChange): void {
        const value = this.__adjustValue(newValue);
        if (this.value === value) {
            return;
        }
        this.value = value;
        if (this.options.showTitle) {
            this.__updateTitle();
        }

        if (updateButtons) {
            this.options.showDate && this.__setValueToDate(value);
            this.options.showTime && this.__setValueToTimeButton(value);
        }

        if (MobileService.isMobile) {
            this.__setValueToMobileInput(this.value);
        }

        if (triggerChange) {
            this.__triggerChange();
        }
    },

    __setEnabled(enabled: boolean): void {
        BaseEditorView.prototype.__setEnabled.call(this, enabled);
        this.enabled = this.getEnabled();
        //__setEnabled() from descendants
        this.calendarDropdownView?.setEnabled(enabled);
        this.timeDropdownView?.setEnabled(enabled);
    },

    __setReadonly(readonly: boolean): void {
        BaseEditorView.prototype.__setReadonly.call(this, readonly);
        this.readonly = this.getReadonly();
        //__setReadonly() from descendants
        this.calendarDropdownView?.setReadonly(readonly);
        this.timeDropdownView?.setReadonly(readonly);
    },

    __onClear(): boolean {
        this.__value(null, true, false);
        this.focus();
        return false;
    },

    __adjustValue(value: string): string {
        return value == null ? null : DateTime.fromISO(value).toString();
    },

    __updateTitle(): void {
        const dateDisplayValue = DateTimeService.getDateDisplayValue(this.getValue(), this.options.dateDisplayFormat);
        const timeDisplayValue = DateTimeService.getTimeDisplayValue(this.getValue(), this.options.timeDisplayFormat);
        const resultValue = `${dateDisplayValue} ${timeDisplayValue}`;
        this.$editorEl.prop('title', resultValue);
    },

    __createDateDropdownEditor() {
        this.dateButtonModel = new Backbone.Model({
            [this.key]: this.value == null ? '' : DateTime.fromISO(this.value).toFormat(this.options.dateDisplayFormat)
        });
        this.listenTo(this.dateButtonModel, `change:${this.key}`, this.__onDateModelChange);

        this.calendarDropdownView = dropdown.factory.createDropdown({
            buttonView: DateInputView,
            buttonViewOptions: {
                model: this.dateButtonModel,
                key: this.key,
                autocommit: true,
                readonly: this.options.readonly,
                allowEmptyValue: this.options.allowEmptyValue,
                dateDisplayFormat: this.options.dateDisplayFormat,
                emptyPlaceholder: Localizer.get('CORE.FORM.EDITORS.DATE.EMPTYPLACEHOLDER'),
                changeMode: 'blur',
                showTitle: false,
                hideClearButton: true
            },
            panelView: DatePanelView,
            panelViewOptions: {
                value: this.value,
                allowEmptyValue: this.options.allowEmptyValue,
                startDate: this.options.startDate,
                endDate: this.options.endDate,
                datesDisabled: this.options.datesDisabled,
                daysOfWeekDisabled: this.options.daysOfWeekDisabled,
                calendar: this.options.calendar
            },
            renderAfterClose: false,
            autoOpen: false,
            popoutFlow: 'right',
            panelMinWidth: 'none',
            class: 'editor_date-time_date'
        });

        this.listenTo(this.calendarDropdownView, 'focus', this.__onDateButtonFocus);
        this.listenTo(this.calendarDropdownView, 'blur', this.onBlur);
        this.listenTo(this.calendarDropdownView, 'panel:select', this.__onPanelDateChange);
        this.showChildView('dateDropdownRegion', this.calendarDropdownView);
        this.listenTo(this.calendarDropdownView, 'keydown', this.__dateButtonInputKeydown);
    },

    __updateDateAndValidateToButton(recipientISO: string, fromFormatted, { includeTime = false }) {
        const recipientMoment = DateTime.fromISO(recipientISO);
        const fromMoment = DateTimeService.tryGetValidMoment(fromFormatted, this.options.dateDisplayFormat);

        if (fromMoment) {
            recipientMoment.set({ year: fromMoment.year, month: fromMoment.month, day: fromMoment.day });
            if (includeTime) {
                recipientMoment.set({ millisecond: fromMoment.millisecond, second: fromMoment.second, minute: fromMoment.minute, hour: fromMoment.hour });
            } else if (recipientISO == null) {
                recipientMoment.milliseconds(0);
                recipientMoment.seconds(0);
                recipientMoment.minutes(0);
                recipientMoment.hours(0);
            }
            this.dateButtonModel.set(this.key, recipientMoment.toFormat(this.options.dateDisplayFormat), {
                inner: true
            });
        } else {
            this.dateButtonModel.set(this.key, Localizer.get('CORE.FORM.EDITORS.DATE.INVALIDDATE'), {
                inner: true
            });
        }
        return recipientMoment.toISO();
    },

    __onDateModelChange(model, formattedDate, options) {
        if (options.inner) {
            return;
        }
        this.__value(this.__updateDateAndValidateToButton(this.value, formattedDate, { includeTime: false }), false, true);
    },

    __setValueToDate(value) {
        this.dateButtonModel.set(this.key, value == null ? value : DateTime.fromISO(value).toFormat(this.options.dateDisplayFormat), {
            inner: true
        });
    },

    __onPanelDateChange(jsDate) {
        this.__value(this.__updateDateAndValidateToButton(this.value, jsDate, { includeTime: false }), true, true);
        this.stopListening(GlobalEventService);
        this.calendarDropdownView?.close();
    },

    __onDateButtonFocus() {
        this.__openCalendarPicker();
        this.onFocus();
    },

    __openCalendarPicker() {
        if (!this.getEditable()) {
            return;
        }
        if (MobileService.isMobile) {
            this.__openNativePicker();
        } else {
            this.calendarDropdownView?.open();
            this.__updatePickerDate(this.value);
            this.calendarDropdownView?.adjustPosition();
        }
    },

    __openTimePicker() {
        if (!this.getEditable()) {
            return;
        }
        if (MobileService.isMobile) {
            this.__openNativePicker();
        } else {
            this.__timeDropdownOpen();
        }
    },

    __openNativePicker() {
        this.ui.mobileInput.trigger('click', true);
    },

    __timeDropdownOpen() {
        this.timeDropdownView?.open();
        const panelView = this.timeDropdownView?.panelView;
        if (!panelView?.collection.length) {
            panelView.collection.reset(this.__getTimeCollection());
        }
    },

    __getTimeCollection() {
        const timeArray = [];

        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 15) {
                const val = { hour: h, minute: m };
                const time = DateTime.fromObject(val);
                const formattedTime = dateHelpers.getDisplayTime(time);

                timeArray.push({
                    time,
                    formattedTime
                });
            }
        }

        return timeArray;
    },

    __dateBlur() {
        this.calendarDropdownView?.close();
        this.calendarDropdownView?.blur();
        this.onBlur();
    },

    __timeBlur() {
        this.timeDropdownView?.close();
        this.timeDropdownView?.blur();
        this.onBlur();
    },

    __createTimeDropdownView() {
        const model = new Backbone.Model({
            [this.key]: this.value == null ? '' : dateHelpers.dateISOToDuration(this.value, { days: false }).toISO()
        });
        this.listenTo(model, 'change', this.__onTimeModelChange);

        const isFormatHasSeconds = dateHelpers.isFormatHasSeconds(this.options.timeDisplayFormat);

        this.timeDropdownView = dropdown.factory.createDropdown({
            buttonView: DurationEditorView,
            buttonViewOptions: _.defaultsPure({
                allowDays: false,
                allowHours: true,
                allowMinutes: true,
                allowSeconds: isFormatHasSeconds,
                allFocusableParts: this.options.allFocusableParts,
                seconds: this.options.seconds,
                minutes: {
                    text: this.options.minutes ? this.options.minutes.text : isFormatHasSeconds ? ':' : ''
                },
                showEmptyParts: true,
                hideClearButton: true,
                fillZero: true,
                normalTime: true,
                showTitle: false,
                autocommit: true,
                readonly: this.getReadonly(),
                editable: this.getEditable(),
                emptyPlaceholder: Localizer.get('CORE.FORM.EDITORS.DATE.TIMEEMPTYPLACEHOLDER'),
                key: this.options.key,
                autocommit: true,
                readonly: this.getReadonly(),
                editable: this.getEditable(),
                model
            }),
            panelView: Marionette.CollectionView.extend({
                collection: new Backbone.Collection(),
                tagName: 'ul',
                className: 'dropdown__wrp dropdown__wrp_time',
                childViewEvents: {
                    select(time) {
                        this.trigger('select', time);
                    }
                },
                childView: Marionette.View.extend({
                    tagName: 'li',
                    className: 'time-dropdown__i',
                    events: {
                        click() {
                            this.trigger('select', this.model.get('time'));
                        }
                    },
                    template: Handlebars.compile('{{formattedTime}}')
                })
            }),
            renderAfterClose: false,
            autoOpen: false,
            class: 'editor_date-time_time'
        });

        this.listenTo(this.timeDropdownView, 'focus', this.__onTimeButtonFocus);
        this.listenTo(this.timeDropdownView, 'blur', this.onBlur);
        this.listenTo(this.timeDropdownView, 'container:click', this.__onTimeButtonFocus);
        this.listenTo(this.timeDropdownView, 'panel:select', this.__onTimePanelSelect);
        this.showChildView('timeDropdownRegion', this.timeDropdownView);
        this.listenTo(this.timeDropdownView, 'keydown', this.__timeButtonInputKeydown);
    },

    __updateTime(ISOstr: string) {
        //replace time of ISO string to time from timebutton
        const valTimeModel = this.timeDropdownView && this.timeDropdownView.model.get(this.key);
        if (!valTimeModel) {
            return;
        }
        const dateMoment = DateTime.fromISO(ISOstr);
        const timeDuration = Duration.fromISO(valTimeModel).toObject();

        dateMoment.set({
            hour: timeDuration.hours,
            minute: timeDuration.minutes,
            second: timeDuration.seconds,
            millisecond: timeDuration.milliseconds
        });

        return dateMoment.toISO();
    },

    __onTimeModelChange(model) {
        if (model.get(this.key) === null) {
            return;
        }
        this.__value(this.__updateTime(this.value), false, true);
    },

    __setValueToTimeButton(dateISOstring: string) {
        const newDuration = dateISOstring && dateHelpers.dateISOToDuration(dateISOstring, { days: false }).toISO();
        this.timeDropdownView && this.timeDropdownView.setValue(newDuration, true);
    },

    __onTimePanelSelect(time) {
        this.__setValueToTimeButton(time);
        this.timeDropdownView.close();
    },

    __onTimeButtonFocus() {
        this.__openTimePicker();
        this.onFocus();
    },

    __onMouseenter() {
        this.$editorEl.off('mouseenter');

        if (!MobileService.isMobile && !this.options.hideClearButton) {
            this.renderIcons(this.options.showDate !== false ? iconWrapDate : iconWrapTime, iconWrapRemove);
        }
    },

    __presentView() {
        if (this.options.showTitle) {
            this.__updateTitle();
        }

        if (this.options.showTime !== false) {
            this.__createTimeDropdownView();
        } else {
            this.getRegion('timeDropdownRegion').reset();
        }

        if (this.options.showDate !== false) {
            this.__createDateDropdownEditor();
        } else {
            this.getRegion('dateDropdownRegion').reset();
        }
    },

    __getClassName() {
        return `${defaultClasses} ${this.displayClasses.dateMapClasses[this.options.dateDisplayFormat] || ''} ${this.displayClasses.timeMapClasses[
            this.options.timeDisplayFormat
        ] || ''}`;
    }
});
