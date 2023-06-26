/*
 * gridlover.tanglekit.js
 * for Tangle (0.1.0)
 *
 * Created by Ville V. Vanninen
 * http://foolproof.me
 * 
 * 
 */

Tangle.classes.mmeter = {
	initialize: function (element, options, tangle, variable) {
		this.meter = element;
		this.initialValue = this.getValue();
	},
	getValue: function () {
		return this.meter.get("value");
	},
	update: function (element, value) {
		var currentValue = this.getValue();
		if (value !== currentValue) { this.meter.set('value', value); }
	}
};	

//----------------------------------------------------------
//
//  tangleInput
//
//  A generic class for any input element, since the browser uses the actual attributes of the element, there should mostly be no need to define any constraints as data-attributes.
//  When dealing with numeric variables, the most useful inputs are of type range or number. Number and range inputs have native min, max and step attributes.
//
Tangle.classes.tangleInput = {

	initialize: function (element, options, tangle, variable) {
		this.input = element;
		this.type = this.input.get('type');
		this.initialValue = this.input.get('value');

		var valueChanged = (function () {
			var value = this.getValue();
			tangle.setValue(variable, value);
		}).bind(this);

		this.input.addEvent('click', valueChanged);
		this.input.addEvent('keyup', valueChanged);
		this.input.addEvent('change', valueChanged);
		this.input.addEvent('input', valueChanged);
	},

	getValue: function () {
		if (this.type == 'number' || this.type == 'range') {
//			var value = parseFloat(this.input.get('value'));
			var value = this.input.valueAsNumber;
		}
		else if (this.type == 'radio' ) {
			//[TODO] Should each input type have a relevant class, is a generic input class the right thing to do?
			var value = this.initialValue;
		}
		else {
			var value = this.input.value;
		};
		//[TODO] undefined? should there be a check here for somehow unacceptable input?
		return value == undefined ? this.initialValue : value;
	},

	update: function (element, value) {
		var currentValue = this.getValue();
		if (value !== currentValue) { this.input.set('value', '' + value); }
		//[TODO] If the generic approach is good:
		// If the input element is a radio button, make the right radio button selected according to the variable value. If no radio buttons value matches the variable value, deselect all.
		if (this.input.get('type') == 'radio') {
			this.input.set('value', '' + this.initialValue);
			if (this.input.get('value') == value) {
				this.input.set('checked', 'checked');
			}
			else {
				this.input.erase('checked');
			}
		}
	}
};
