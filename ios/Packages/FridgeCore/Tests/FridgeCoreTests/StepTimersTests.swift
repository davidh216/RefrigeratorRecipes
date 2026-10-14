import XCTest
@testable import FridgeCore

final class StepTimersTests: XCTestCase {
    private func timers(_ text: String) -> [[Int?]] {
        StepTimers.find(in: text).map { [$0.seconds, $0.upperSeconds] }
    }

    func testEnglish() {
        XCTAssertEqual(timers("Simmer 20 minutes, stirring once."), [[1200, nil]])
        XCTAssertEqual(timers("Bake 25 to 30 minutes until golden."), [[1500, 1800]])
        XCTAssertEqual(timers("Cook 1 hour 30 minutes on low."), [[5400, nil]])
        XCTAssertEqual(timers("Bake 45 minutes to 1 hour."), [[2700, 3600]], "one range, two units")
        XCTAssertEqual(timers("Cook for 1 1/2 hours."), [[5400, nil]])
        XCTAssertEqual(timers("Rest for a minute, then slice."), [[60, nil]])
        XCTAssertEqual(timers("Simmer 2 more minutes if thin."), [[120, nil]])
        XCTAssertEqual(timers("Stir 30 seconds, then cook 5 minutes."), [[30, nil], [300, nil]])
        XCTAssertEqual(timers("Cook on LOW for 7 to 8 hours or HIGH for 4 hours."), [[25200, 28800], [14400, nil]])
        XCTAssertEqual(timers("Marinate 2 hours or overnight."), [[7200, nil]])
    }

    func testPhraseIsTheWordsInTheStep() {
        XCTAssertEqual(StepTimers.find(in: "Bake 25 to 30 minutes until golden.").first?.phrase, "25 to 30 minutes")
    }

    func testOtherLanguages() {
        XCTAssertEqual(timers("Cocina de 8 a 10 minutos."), [[480, 600]])
        XCTAssertEqual(timers("Hornea una hora."), [[3600, nil]])
        XCTAssertEqual(timers("3~4분간 볶아 주세요."), [[180, 240]])
        XCTAssertEqual(timers("1시간 30분 끓이세요."), [[5400, nil]])
        XCTAssertEqual(timers("1분 30초~2분씩 구우세요."), [[90, 120]])
        XCTAssertEqual(timers("煮 8–10 分钟。"), [[480, 600]])
        XCTAssertEqual(timers("加热一分钟。"), [[60, nil]])
    }

    func testNotTimers() {
        XCTAssertEqual(timers("Cook 2 minced garlic cloves."), [], "min isn't minutes in minced")
        XCTAssertEqual(timers("Agrega el ajo ahora y mezcla."), [], "ahora isn't a hora")
        XCTAssertEqual(timers("마늘 3분의 2를 넣으세요."), [], "3분의 2 is two-thirds")
        XCTAssertEqual(timers("Season with 1/2 tsp salt."), [])
        XCTAssertEqual(timers("Chill at least 24 hours."), [], "longer than 12 hours")
        XCTAssertEqual(timers("Blend 5 seconds."), [], "shorter than 10 seconds")
        XCTAssertEqual(timers("충분한 시간을 두세요."), [], "충분한 시간 is enough time, not one hour")
        XCTAssertEqual(timers("三分之一的糖。"), [], "a third, not three minutes")
    }

    func testHalvesAndMixedNumbers() {
        XCTAssertEqual(timers("Let it rise for half an hour."), [[1800, nil]])
        XCTAssertEqual(timers("Roast for an hour and a half."), [[5400, nil]])
        XCTAssertEqual(timers("Braise 2 and a half hours."), [[9000, nil]])
        XCTAssertEqual(timers("Braise 1-1/2 hours."), [[5400, nil]], "mixed number, not 1 to ½")
        XCTAssertEqual(timers("Cook 1-2 hours."), [[3600, 7200]])
        XCTAssertEqual(timers("Deja reposar media hora."), [[1800, nil]])
        XCTAssertEqual(timers("Hornea una hora y media."), [[5400, nil]])
        XCTAssertEqual(timers("Hornea 2 horas y media."), [[9000, nil]])
        XCTAssertEqual(timers("1시간 반 끓이세요."), [[5400, nil]])
        XCTAssertEqual(timers("炖一个半小时。"), [[5400, nil]])
        XCTAssertEqual(timers("炖两个半小时。"), [[9000, nil]])
        XCTAssertEqual(timers("炖半个小时。"), [[1800, nil]])
    }

    func testMoreNumberWords() {
        XCTAssertEqual(timers("煮三分钟。"), [[180, nil]])
        XCTAssertEqual(timers("煮十五分钟。"), [[900, nil]])
        XCTAssertEqual(timers("焖二十分钟。"), [[1200, nil]])
        XCTAssertEqual(timers("한 시간 끓이세요."), [[3600, nil]])
        XCTAssertEqual(timers("두 시간 재워 두세요."), [[7200, nil]])
    }

    func testSeparateDurationsStaySeparate() {
        XCTAssertEqual(timers("Boil 10 minutes, 5 minutes for soft yolks."), [[600, nil], [300, nil]])
        XCTAssertEqual(StepTimers.find(in: "Boil 10 minutes, 5 minutes for soft yolks.").first?.phrase, "10 minutes")
        XCTAssertEqual(timers("Bake 1 hour, then 30 minutes uncovered."), [[3600, nil], [1800, nil]])
    }
}
