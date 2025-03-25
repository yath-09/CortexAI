import FAQAccordian from "./components/FaqAccordian";
import HeroSection from "./components/HeroSection";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/testinomials";

export default function Home() {
  return (
    <div>
        <HeroSection/>
        <HowItWorks/>
        <Testimonials/>
        <FAQAccordian/>
        
    </div>
  );
}