import { disconnectDb } from "../db.js";
import { findCommunitiesInBoundingBox, findCommunitiesWithIntersection } from "../models/communityBoundary.js";

// const communities = await findCommunitiesInBoundingBox(
//     49.05684240622569
//     , -114.09853706337815
//     , 51.03751197052317
//     , -114.04149878161581
// )
const communities = await findCommunitiesWithIntersection(
    51.05684240622569
    , -114.09853706337815
    , 51.03751197052317
    , -114.04149878161581
)
for (const community of communities) {
    console.log(community.name, ':', community.boundary.coordinates)
}

console.log(`Found, ${communities.length} communities`);

await disconnectDb();
