import FuzzyText from './FuzzyText.jsx';
import { useNavigate } from 'react-router-dom';
export default function NotFound() {
    const navigate = useNavigate();
    return (
        <div className='flex flex-col items-center justify-center h-screen text-center ml-72'>
            <FuzzyText 
                baseIntensity={0.2} 
                hoverIntensity={0.5} 
                enableHover={true}
            >
                404
            </FuzzyText>

            <FuzzyText 
                baseIntensity={0.2} 
                hoverIntensity={0.5} 
                enableHover={true}
            >
                Not Found
            </FuzzyText>

            <button className='mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded'
            onClick={()=>navigate('/')}>
                Go Back
            </button>   
        </div>
    );
}
