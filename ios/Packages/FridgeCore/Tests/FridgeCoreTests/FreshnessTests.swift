import XCTest
@testable import FridgeCore

final class FreshnessTests: XCTestCase {
    func testShortLabels() {
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 0).shortLabel, "Today")
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 1).shortLabel, "Tomorrow")
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 3).shortLabel, "3 days")
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 13).shortLabel, "13 days")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 13).shortLabel, "13 days")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 20).shortLabel, "2 wks")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 90).shortLabel, "3 mo")
        XCTAssertEqual(ExpiryStatus.expired(daysAgo: 1).shortLabel, "1 day past")
        XCTAssertEqual(ExpiryStatus.expired(daysAgo: 4).shortLabel, "4 days past")
        XCTAssertEqual(ExpiryStatus.unknown.shortLabel, "No date")
    }

    func testSpokenLabels() {
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 0).spokenLabel(), "Expires today")
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 1).spokenLabel(), "Expires tomorrow")
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 3).spokenLabel(), "Expires in 3 days")
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 13).spokenLabel(), "Expires in 13 days")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 13).spokenLabel(), "Fresh, 13 days left")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 20).spokenLabel(), "Fresh, 2 weeks left")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 90).spokenLabel(), "Fresh, 3 months left")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 90).spokenLabel(inFreezer: true), "Frozen, 3 months left")
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 1).spokenLabel(), "Fresh, 1 day left")
        XCTAssertEqual(ExpiryStatus.expired(daysAgo: 1).spokenLabel(), "Expired yesterday")
        XCTAssertEqual(ExpiryStatus.expired(daysAgo: 4).spokenLabel(), "Expired 4 days ago")
        XCTAssertEqual(ExpiryStatus.unknown.spokenLabel(), "No expiration date")
        XCTAssertEqual(ExpiryStatus.unknown.spokenLabel(inFreezer: true), "No expiration date")
    }

    func testDialParts() {
        func assertParts(_ status: ExpiryStatus, _ value: String, _ unit: String, line: UInt = #line) {
            let parts = status.dialParts
            XCTAssertEqual(parts.value, value, line: line)
            XCTAssertEqual(parts.unit, unit, line: line)
        }
        assertParts(.expiringSoon(daysLeft: 0), "0", "use today")
        assertParts(.expiringSoon(daysLeft: 1), "1", "day left")
        assertParts(.expiringSoon(daysLeft: 3), "3", "days left")
        assertParts(.fresh(daysLeft: 13), "13", "days left")
        assertParts(.fresh(daysLeft: 20), "2", "weeks left")
        assertParts(.fresh(daysLeft: 90), "3", "months left")
        assertParts(.expired(daysAgo: 1), "1", "day past")
        assertParts(.expired(daysAgo: 4), "4", "days past")
        assertParts(.unknown, "–", "no date")
    }

    func testToneUsesTheFreezerFlagOnlyForFreshItems() {
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 30).tone(inFreezer: true), .paused)
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 30).tone(), .fresh)
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 2).tone(inFreezer: true), .soon)
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 1).tone(), .today)
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 0).tone(), .today)
        XCTAssertEqual(ExpiryStatus.expired(daysAgo: 3).tone(inFreezer: true), .past)
        XCTAssertEqual(ExpiryStatus.unknown.tone(), FreshTone.none)
    }

    func testDialFraction() {
        XCTAssertEqual(ExpiryStatus.expiringSoon(daysLeft: 0).dialFraction, 0.04, accuracy: 0.0001)
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 7).dialFraction, 0.5, accuracy: 0.0001)
        XCTAssertEqual(ExpiryStatus.fresh(daysLeft: 30).dialFraction, 1, accuracy: 0.0001)
        XCTAssertEqual(ExpiryStatus.expired(daysAgo: 2).dialFraction, 0, accuracy: 0.0001)
        XCTAssertEqual(ExpiryStatus.unknown.dialFraction, 0, accuracy: 0.0001)
    }

    func testCountsBuckets() {
        let counts = FreshnessCounts([
            (status: .expired(daysAgo: 3), inFreezer: false),
            (status: .expiringSoon(daysLeft: 0), inFreezer: false),
            (status: .expiringSoon(daysLeft: 1), inFreezer: true),
            (status: .expiringSoon(daysLeft: 2), inFreezer: false),
            (status: .fresh(daysLeft: 10), inFreezer: false),
            (status: .fresh(daysLeft: 40), inFreezer: true),
            (status: .unknown, inFreezer: false),
        ])
        XCTAssertEqual(counts.past, 1)
        XCTAssertEqual(counts.today, 1)
        XCTAssertEqual(counts.tomorrow, 1)
        XCTAssertEqual(counts.soon, 1)
        XCTAssertEqual(counts.fresh, 1)
        XCTAssertEqual(counts.paused, 1)
        XCTAssertEqual(counts.noDate, 1)
        XCTAssertEqual(counts.byTomorrow, 2)
        XCTAssertEqual(counts.total, 7)
        XCTAssertEqual(counts.count(for: .today), 2)
        XCTAssertEqual(counts.count(for: .past), 1)
        XCTAssertEqual(counts.count(for: .paused), 1)
        XCTAssertEqual(counts.count(for: FreshTone.none), 1)
        XCTAssertEqual(counts.spokenSummary, "Freshness: 1 past date, 2 by tomorrow, 1 this week, 1 fresh, 1 frozen, 1 no date")
    }

    func testSpokenSummaryOmitsZeroBuckets() {
        var counts = FreshnessCounts()
        counts.add(.fresh(daysLeft: 9), inFreezer: false)
        counts.add(.fresh(daysLeft: 12), inFreezer: false)
        counts.add(.expired(daysAgo: 1), inFreezer: false)
        XCTAssertEqual(counts.spokenSummary, "Freshness: 1 past date, 2 fresh")
        XCTAssertEqual(FreshnessCounts().spokenSummary, "Freshness: nothing here yet")
    }

    func testHeadlinePrecedence() {
        XCTAssertEqual(FreshnessCounts().headline, "Nothing here yet")

        let today = FreshnessCounts([
            (status: .expiringSoon(daysLeft: 0), inFreezer: false),
            (status: .expiringSoon(daysLeft: 0), inFreezer: false),
            (status: .expiringSoon(daysLeft: 1), inFreezer: false),
            (status: .expired(daysAgo: 2), inFreezer: false),
            (status: .fresh(daysLeft: 9), inFreezer: false),
        ])
        XCTAssertEqual(today.headline, "2 to use today")

        let tomorrow = FreshnessCounts([
            (status: .expiringSoon(daysLeft: 1), inFreezer: false),
            (status: .expiringSoon(daysLeft: 2), inFreezer: false),
            (status: .expired(daysAgo: 2), inFreezer: false),
        ])
        XCTAssertEqual(tomorrow.headline, "1 to use by tomorrow")

        let week = FreshnessCounts([
            (status: .expiringSoon(daysLeft: 2), inFreezer: false),
            (status: .expiringSoon(daysLeft: 3), inFreezer: true),
            (status: .expired(daysAgo: 1), inFreezer: false),
        ])
        XCTAssertEqual(week.headline, "2 to use this week")

        let onePast = FreshnessCounts([
            (status: .expired(daysAgo: 1), inFreezer: false),
            (status: .fresh(daysLeft: 9), inFreezer: false),
        ])
        XCTAssertEqual(onePast.headline, "1 past its date")

        let manyPast = FreshnessCounts([
            (status: .expired(daysAgo: 1), inFreezer: false),
            (status: .expired(daysAgo: 5), inFreezer: false),
            (status: .expired(daysAgo: 2), inFreezer: false),
        ])
        XCTAssertEqual(manyPast.headline, "3 past their date")

        let fresh = FreshnessCounts([
            (status: .fresh(daysLeft: 9), inFreezer: false),
            (status: .fresh(daysLeft: 30), inFreezer: true),
            (status: .unknown, inFreezer: false),
        ])
        XCTAssertEqual(fresh.headline, "Everything's fresh")
    }
}
