import XCTest
@testable import FridgeCore

final class NutritionTargetsTests: XCTestCase {
    let body = BodyDetails(age: 35, sex: .female, heightCm: 165, weightKg: 70, activity: .light)

    func testMifflinStJeor() {
        // 10·70 + 6.25·165 − 5·35 − 161 = 1395.25
        XCTAssertEqual(NutritionTargets.restingEnergy(body), 1395.25, accuracy: 0.01)
        var male = body
        male.sex = .male
        XCTAssertEqual(NutritionTargets.restingEnergy(male), 1561.25, accuracy: 0.01)
        XCTAssertEqual(NutritionTargets.maintenanceCalories(body), 1395.25 * 1.375, accuracy: 0.01)
    }

    func testGoalsAdjustAndRoundCalories() {
        // Maintenance ≈ 1918.5
        XCTAssertEqual(NutritionTargets.suggestedCalories(goal: .maintain, body: body), 1900)
        XCTAssertEqual(NutritionTargets.suggestedCalories(goal: .lose, body: body), 1400)
        XCTAssertEqual(NutritionTargets.suggestedCalories(goal: .gain, body: body), 2200)
        XCTAssertEqual(NutritionTargets.suggestedCalories(goal: .maintain, body: nil), 2000)
        // Never below the floor.
        let small = BodyDetails(age: 80, sex: .female, heightCm: 150, weightKg: 45, activity: .sedentary)
        XCTAssertEqual(NutritionTargets.suggestedCalories(goal: .lose, body: small), 1200)
        // Implausible details are ignored.
        let typo = BodyDetails(age: 35, sex: .female, heightCm: 16.5, weightKg: 70, activity: .light)
        XCTAssertEqual(NutritionTargets.suggestedCalories(goal: .maintain, body: typo), 2000)
    }

    func testSuggestedMacrosAddUp() {
        let targets = NutritionTargets.suggested(goal: .lose, body: body)
        XCTAssertEqual(targets.kcal, 1400)
        XCTAssertEqual(targets.protein, 110) // 1.6 g/kg, rounded to 5
        XCTAssertEqual(targets.fat, 47)
        XCTAssertEqual(targets.fiber, 20)
        let fromMacros = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9
        XCTAssertEqual(fromMacros, targets.kcal, accuracy: 5)

        let noBody = NutritionTargets.suggested(goal: .moreProtein, body: nil)
        XCTAssertEqual(noBody.protein, 150) // 30% of 2,000 kcal
    }

    func testMealSplit() {
        let split = MealSplit()
        XCTAssertEqual(split.share(of: .dinner), 0.35)
        let total = MealKind.allCases.map { split.share(of: $0) }.reduce(0, +)
        XCTAssertEqual(total, 1, accuracy: 0.0001)
        XCTAssertEqual(MealSplit(dinner: 0.9).dinner, 0.6)
        let daily = NutritionFacts(kcal: 2000, protein: 100)
        XCTAssertEqual(NutritionTargets.perMeal(daily, meal: .dinner).kcal, 700, accuracy: 0.01)
    }

    func testTargetStatus() {
        XCTAssertEqual(TargetStatus.of(kcal: 650, target: 700), .onTarget)
        XCTAssertEqual(TargetStatus.of(kcal: 600, target: 700), .under)
        XCTAssertEqual(TargetStatus.of(kcal: 800, target: 700), .over)
    }
}

final class NutritionObjectiveTests: XCTestCase {
    let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    lazy var monday = calendar.date(from: DateComponents(year: 2026, month: 6, day: 8, hour: 17))!
    func day(_ n: Int) -> Date { calendar.date(byAdding: .day, value: n, to: monday)! }

    /// Everything in stock, nothing expiring: only nutrition separates these.
    let stock = ["Chicken", "Rice", "Pasta", "Cream", "Lentils", "Tofu", "Salad"].map { StockItem(name: $0) }

    func recipe(_ title: String, _ ingredients: [String]) -> TonightRecipe {
        TonightRecipe(title: title, requirements: ingredients.map { IngredientRequirement(name: $0) }, totalMinutes: 30)
    }

    lazy var recipes = [
        recipe("Creamy pasta", ["Pasta", "Cream"]),       // 0: heavy, low protein
        recipe("Chicken rice", ["Chicken", "Rice"]),      // 1: on target
        recipe("Tofu salad", ["Tofu", "Salad"]),          // 2: light, high protein
        recipe("Lentil rice", ["Lentils", "Rice"]),       // 3: under, moderate protein
    ]
    let nutrition: [NutritionFacts?] = [
        NutritionFacts(kcal: 1100, protein: 20),
        NutritionFacts(kcal: 700, protein: 45),
        NutritionFacts(kcal: 420, protein: 38),
        NutritionFacts(kcal: 520, protein: 22),
    ]
    let daily = NutritionFacts(kcal: 2000, protein: 120)

    func testBalancedPrefersTheRecipeClosestToTheDinnerTarget() {
        let objective = NutritionObjective(style: .balanced, dailyTargets: [daily], recipeNutrition: nutrition)
        XCTAssertEqual(objective.averageTarget!.kcal, 700, accuracy: 0.01)
        XCTAssertEqual(objective.averageTarget!.protein, 42, accuracy: 0.01)
        let best = WeekPlanner.alternative(on: day(0), recipes: recipes, stock: stock, excluding: [],
                                           objective: objective, calendar: calendar)
        XCTAssertEqual(best, 1)
        XCTAssertGreaterThan(objective.fit(recipe: 1)!, objective.fit(recipe: 0)!)
    }

    func testLighterAndHighProteinChangeThePick() {
        let lighter = NutritionObjective(style: .lighter, dailyTargets: [daily], recipeNutrition: nutrition)
        XCTAssertEqual(WeekPlanner.alternative(on: day(0), recipes: recipes, stock: stock, excluding: [1],
                                               objective: lighter, calendar: calendar), 2)
        let protein = NutritionObjective(style: .highProtein, dailyTargets: [daily], recipeNutrition: nutrition)
        XCTAssertGreaterThan(protein.fit(recipe: 2)!, protein.fit(recipe: 3)!)
        XCTAssertLessThan(protein.fit(recipe: 0)!, 0.4)
    }

    func testNoGoalsMeansBalancedIgnoresNutrition() {
        let objective = NutritionObjective(style: .balanced, dailyTargets: [], recipeNutrition: nutrition)
        XCTAssertFalse(objective.usesNutrition)
        XCTAssertNil(objective.fit(recipe: 0))
        // High protein still works without goals, against a reference day.
        let protein = NutritionObjective(style: .highProtein, dailyTargets: [], recipeNutrition: nutrition)
        XCTAssertTrue(protein.usesNutrition)
    }

    func testUnknownNutritionIsNeutral() {
        let objective = NutritionObjective(style: .balanced, dailyTargets: [daily], recipeNutrition: [nil])
        let match = RecipeMatcher.match(requirements: [IngredientRequirement(name: "Rice")], stock: stock)
        XCTAssertEqual(objective.adjustment(recipe: 0, match: match), 0)
        XCTAssertEqual(objective.adjustment(recipe: 5, match: match), 0)
    }

    func testEveryonesTargetCounts() {
        let small = NutritionFacts(kcal: 1400, protein: 80)
        let objective = NutritionObjective(style: .balanced, dailyTargets: [daily, small], recipeNutrition: nutrition)
        XCTAssertEqual(objective.mealTargets.count, 2)
        XCTAssertEqual(objective.averageTarget!.kcal, 595, accuracy: 0.01)
    }

    func testBudgetPrefersNotShopping() {
        let recipes = [
            recipe("Needs shopping", ["Chicken", "Leeks", "Saffron"]),
            recipe("From the pantry", ["Lentils", "Rice"]),
        ]
        let facts: [NutritionFacts?] = [NutritionFacts(kcal: 700, protein: 42), NutritionFacts(kcal: 520, protein: 22)]
        let budget = NutritionObjective(style: .budget, dailyTargets: [daily], recipeNutrition: facts)
        XCTAssertEqual(WeekPlanner.alternative(on: day(0), recipes: recipes, stock: stock, excluding: [],
                                               objective: budget, calendar: calendar), 1)
    }

    func testWeekBalancingAimsLowerAfterAHeavyNight() {
        XCTAssertEqual(WeekPlanner.balance(shares: 1.5, known: 1, nightsLeft: 2), 0.75)
        XCTAssertEqual(WeekPlanner.balance(shares: 0.8, known: 1, nightsLeft: 2), 1.1, accuracy: 0.0001)
        XCTAssertEqual(WeekPlanner.balance(shares: 3, known: 3, nightsLeft: 4), 1)

        // Only heavy and light options: a heavy night is followed by a light one.
        let recipes = [
            recipe("Creamy pasta", ["Pasta", "Cream"]),
            recipe("Tofu salad", ["Tofu", "Salad"]),
            recipe("Chicken rice", ["Chicken", "Rice"]),
            recipe("Lentil rice", ["Lentils", "Rice"]),
        ]
        let facts: [NutritionFacts?] = [
            NutritionFacts(kcal: 900, protein: 42),
            NutritionFacts(kcal: 480, protein: 42),
            NutritionFacts(kcal: 880, protein: 42),
            NutritionFacts(kcal: 560, protein: 42),
        ]
        let objective = NutritionObjective(style: .balanced, dailyTargets: [daily], recipeNutrition: facts)
        let picks = WeekPlanner.fill(days: [day(0), day(1), day(2), day(3)], recipes: recipes, stock: stock,
                                     objective: objective, calendar: calendar)
        XCTAssertEqual(picks.count, 4)
        // Without balancing, the two heavy dishes (closest to 700 after the lentils) would land back to back.
        for (a, b) in zip(picks, picks.dropFirst()) {
            let heavyA = facts[a.recipeIndex]!.kcal > 700, heavyB = facts[b.recipeIndex]!.kcal > 700
            XCTAssertNotEqual(heavyA, heavyB, "Nights \(a.dayIndex) and \(b.dayIndex) should alternate")
        }
    }

    func testFillWithoutObjectiveIsUnchanged() {
        let plain = WeekPlanner.fill(days: [day(0), day(1)], recipes: recipes, stock: stock, calendar: calendar)
        let neutral = WeekPlanner.fill(days: [day(0), day(1)], recipes: recipes, stock: stock,
                                       objective: NutritionObjective(style: .balanced, dailyTargets: [], recipeNutrition: nutrition),
                                       calendar: calendar)
        XCTAssertEqual(plain, neutral)
    }
}
