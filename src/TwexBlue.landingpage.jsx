// TwexBlue.landingpage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './assets/TwexBlue.svg';
import pageStyle from './modules/TwexBlue.landingpage.module.css';

// LandingPage
const LandingPage = () => {
    let navigate = useNavigate();

    // go to gethandles
    const navigateGetHandles = () => {
        navigate('/gethandles');
    }

    // FAQ content
    const faqContent = (
        <>
            <h2>About TwexBlue</h2>
            <p>TwexBlue allows importing a X/Twitter block list to check if the blocked accounts also exist on Bluesky. <br></br>
                Users can block the identified accounts on Bluesky or add them to a new list for further use.</p>
            
            <h2>How the import works</h2>
            <p>Uploading a X/Twitter data archive containing the block list is required. This can be requested in the settings of X/Twitter. <br></br>
                TwexBlue converts these into usable handles and matches them with accounts on Bluesky.</p>
            <p><b>Note:</b> The relevant block list is located in the X/Twitter archive under <b>"data/block"</b> and can also be uploaded separately to avoid providing the entire
            archive.</p>
    
            <h2>Privacy and processing</h2>
            <p>The data is processed exclusively in the browser and not stored on servers to ensure privacy and security.<br></br>
                Only status messages are logged to ensure secure data processing.</p>
    
            <h2>Requirements for matching</h2>
            <p>For successful identification, the accounts in the block list must use the same handle on Twitter and Bluesky.</p>
            
            <h2>Contact and feedback</h2>
            <p>If you have any questions, criticism, or suggestions about the functionality of TwexBlue, feel free to contact{' '} 
            <a href="https://bsky.app/profile/hello.its.katerstrophal.me" target="_blank" rel="noopener noreferrer">@hello.its.katerstrophal.me</a>{' '} on Bluesky.</p>
        </>
    );

    // render JSX
    return (
        <div className={pageStyle['landing-page']}>
            <header className={pageStyle.logoContainer}>
                <img src={Logo} className={pageStyle.logo} alt="TwexBlue" />
                <span className={pageStyle.logoText}>TwexBlue</span>
            </header>
            <div className={pageStyle['centered-content']}>
                <main>
                    <section className="faq">
                        {faqContent}
                    </section>
                </main>
                <button className="button" onClick={navigateGetHandles}>Next</button>
            </div>
        </div>
    );
}

export default LandingPage;