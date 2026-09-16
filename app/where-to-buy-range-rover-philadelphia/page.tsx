import type {Metadata} from 'next';
import ModelLanding from '../ModelLanding';

export const metadata:Metadata={
 title:'Where to Buy a Range Rover Near Philadelphia | Jon Rover',
 description:'Looking for where to buy a Range Rover near Philadelphia? Shop current Range Rover inventory and get direct help from Jon McGeehan at Jaguar Land Rover Willow Grove.',
 alternates:{canonical:'/where-to-buy-range-rover-philadelphia'},
 openGraph:{title:'Where to Buy a Range Rover Near Philadelphia | Jon Rover',description:'Shop Range Rover inventory near Philadelphia and get direct help choosing the right vehicle from Jon McGeehan at Jaguar Land Rover Willow Grove.',url:'https://www.jonrover.com/where-to-buy-range-rover-philadelphia',type:'website'}
};

export default function Page(){return <ModelLanding
 eyebrow="BUY A RANGE ROVER · PHILADELPHIA AREA"
 title="WHERE TO BUY A RANGE ROVER NEAR PHILADELPHIA"
 lead="If you’re searching for the right place to buy a Range Rover near Philadelphia, start with the actual inventory and a real person who can help you compare it. I’m Jon McGeehan—Jon Rover—at Jaguar Land Rover Willow Grove."
 heading="A simpler way to shop for a Range Rover."
 current="Range Rover"
 heroImage="/rangerover-hero.png"
 heroAlt="Range Rover available near Philadelphia"
 paragraphs={[
  "You do not need to start by driving from dealership to dealership. Start with the Range Rovers that are actually available, then narrow them by budget, new versus pre-owned, wheelbase, powertrain, equipment, color and warranty coverage. I can help you compare the differences before you make the trip.",
  "Jaguar Land Rover Willow Grove serves Range Rover shoppers from Philadelphia, the Main Line, Montgomery County, Bucks County, South Jersey and beyond. Jon Rover gives you a direct way to browse current inventory, research ownership questions, check a deal and contact me about a specific vehicle.",
  "If you are deciding between a Range Rover and Range Rover Sport, or between new, used and Certified Pre-Owned, tell me what matters most to you. I’ll help narrow the choices to the vehicles that best match what you are trying to accomplish rather than making you sort through every listing yourself.",
  "Before visiting, contact me to confirm current availability, equipment and the details of the vehicle you are considering. Inventory can change, so confirming the specific Range Rover first can save you a trip."
 ]}
/>}
