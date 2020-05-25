import { compose, withState } from 'recompose';

import AuthScreen from './AuthView';

export default compose(withState('isExtended', 'setIsExtended', false))(
  AuthScreen,
);
