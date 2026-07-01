import { useMemo } from 'react';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'libphonenumber-js';
import 'react-phone-number-input/style.css';
import './PhoneNumberField.css';

/**
 * PhoneNumberField — international phone input that integrates with
 * the PayPing design system.
 *
 * Wraps `react-phone-number-input` and overrides its default styling so
 * the field reads as native to the rest of the app (matches the
 * `.client-form-field` / `.settings-text-input` input rhythm). The
 * `value` prop is an E.164 string (e.g. `+919876543210`) — same
 * shape the backend already stores. Empty / `undefined` is treated
 * as "no phone" and is always valid (the field is optional in
 * PayPing).
 *
 * The default `<select>` is used for the country list. Modern browsers
 * (Chrome, Edge, Firefox) support type-ahead filtering inside a native
 * `<select>`, which gives a searchable country list with zero extra
 * UI code. Country names are pulled from the library's bundled locale
 * file so the dropdown reads in plain English like the rest of the
 * app.
 *
 * Props:
 *   - id / name: standard form-field identity (the rendered <input>
 *     receives `id` and `name`; the country select is given
 *     `${id}-country` for aria-by).
 *   - value: E.164 string (controlled).
 *   - onChange(value: string | undefined): receives the E.164 string,
 *     or `undefined` if the user clears the field.
 *   - defaultCountry: ISO country code (e.g. 'IN') used to pre-pick
 *     a flag when the value is empty. Defaults to 'IN' to match
 *     PayPing's primary market.
 *   - disabled: passed through to both the input and the country
 *     select.
 *   - placeholder: shown inside the input when empty.
 *   - error: optional string. When set, the field renders an inline
 *     error below the input. The component also surfaces its own
 *     validation message when the user has typed something that
 *     isn't a valid phone number — the `error` prop is for
 *     cross-field errors set by the parent form.
 */
export default function PhoneNumberField({
  id,
  name,
  value,
  onChange,
  defaultCountry = 'IN',
  disabled = false,
  placeholder = 'Phone number',
  error = '',
}) {
  // The library's onChange signature is `(value?: E164Number) => void`.
  // The parent's onChange receives the same shape so the E.164 string
  // can be forwarded straight into the API payload with no parsing.
  const handleChange = (next) => {
    onChange?.(next || undefined);
  };

  // Show the library's own validation message only when the user has
  // actually typed something (i.e. a non-empty but invalid number).
  // Empty stays valid because the field is optional.
  const localError = useMemo(() => {
    if (error) return error;
    if (!value) return '';
    if (!isValidPhoneNumber(value)) {
      return 'Please enter a valid phone number';
    }
    return '';
  }, [error, value]);

  return (
    <div
      className={`phone-number-field${disabled ? ' is-disabled' : ''}${localError ? ' has-error' : ''}`}
    >
      <PhoneInput
        id={id}
        name={name}
        value={value || ''}
        onChange={handleChange}
        defaultCountry={defaultCountry}
        disabled={disabled}
        placeholder={placeholder}
        // `smartCaret` keeps the caret positioned sensibly as the
        // user types — much better UX than the default cursor jump
        // when the library auto-inserts the country code prefix.
        smartCaret
        // All countries are available by default; the default <select>
        // renders them in alphabetical order which is what the
        // type-ahead search in modern browsers expects.
        international
        countryCallingCodeEditable={false}
        numberInputProps={{
          id,
          name,
          'aria-invalid': localError ? 'true' : 'false',
          'aria-describedby': localError ? `${id}-error` : undefined,
        }}
        countrySelectProps={{
          id: id ? `${id}-country` : undefined,
          name: name ? `${name}-country` : undefined,
          'aria-label': 'Country',
          disabled,
        }}
      />
      {localError && (
        <span
          id={id ? `${id}-error` : undefined}
          className="phone-number-field-error"
          role="alert"
        >
          {localError}
        </span>
      )}
    </div>
  );
}
