import { CognitoUserPool, CognitoUserAttribute, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { parsePhoneNumberFromString } from 'libphonenumber-js'

function _authenticate(cognitoUser) {
	const authDetails = new AuthenticationDetails({
		Username: cognitoUser.username,
		Password: 'password',
	});

	cognitoUser.authenticateUser(authDetails, {
		onSuccess: (authResult) => {
			if (authResult) {
				const credentials = {
					accessToken: authResult.getAccessToken().getJwtToken(),
					idToken: authResult.idToken.jwtToken,
				};
				console.log('Login succeded:', credentials);
			} else {
				console.log('No credentials received.')
			}
		},
		onFailure: (authErr) => {
			console.log('Auth failed:', authErr);
		},
		mfaRequired: function (codeDeliveryDetails) {
			const authenticationCode = prompt('Please input authentication code' ,'');
			cognitoUser.sendMFACode(authenticationCode, this);
		},
	});
}

function _signUp(userPool, number) {
	const phoneNumberAttribute = new CognitoUserAttribute({
		Name: 'phone_number',
		Value: number,
	});

	const cognitoUser = new CognitoUser({
		Username: number,
		Pool: userPool,
	});

	userPool.signUp(
		number,
		'password',
		[phoneNumberAttribute],
		null,
		(signUpErr, signUpResult) => {
			if (signUpErr && signUpErr.code === 'UsernameExistsException') {
				_authenticate(cognitoUser);
				return;
			} else if (signUpErr) {
				console.log('Signup failed:', signUpErr);
				return;
			}

			console.log('Signup succeded:', signUpResult.user);

			const verificationCode = prompt('Please input verification code' ,'');
			cognitoUser.confirmRegistration(
				verificationCode,
				true,
				(confirmRegErr, confirmRegResult) => {
					if (confirmRegErr) {
						console.log('Confirmation registration failed:', confirmRegErr);
						return;
					}

					console.log('Confirmation registration succeded:', confirmRegResult);
					_authenticate(cognitoUser);
				},
			);
		}
	);
}

function _login(phoneNumber, userPool) {
	const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber);
	if (parsedPhoneNumber) {
		_signUp(userPool, parsedPhoneNumber.number)
	}
}

function setup() {
	// Configure Cognito User Pool
	const poolData = {
		UserPoolId : process.env.USER_POOL_ID,
		ClientId : process.env.CLIENT_ID,
	};
	const userPool = new CognitoUserPool(poolData);

	// Get elements
	const $loginForm = document.getElementById('js-login-form');
	const $loginPhoneInput = document.getElementById('js-login-phone-input');

	// Add event listener to login from submit
	$loginForm.addEventListener('submit', (event) => {
		event.preventDefault();
		_login($loginPhoneInput.value, userPool);
	});
}

export default {
	setup
};
