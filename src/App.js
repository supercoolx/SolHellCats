import React from 'react';
import Home from './pages/Home';
import CandyMachineProvider from './CandyMachineContext';

const App = () => {
	
	return (
		<CandyMachineProvider>
			<Home />
		</CandyMachineProvider>
	)
};

export default App;
