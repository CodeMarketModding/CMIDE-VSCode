// API reference only. The game supplies the implementation.
using System;
using System.Collections.Generic;
namespace CodeMarket.SDK;

public enum Product { Tomato, Pumpkin, Bread, Soda, Beer, Cigarettes, Wine, Milk, Tulips, Honey, Watermelon, Tangerine, Strawberry, Eastercake, Fireworks, Tree, Steak, Truffle, Caviar, Lobster, Chocolate, Popcorn, Coffee, Icecream, Jam, Fertilizer, Mask, Whisky, Cognac }

public static class ProductExtensions
{
    public static bool IsAlcohol(this Product product) => throw new NotSupportedException("Reference stub");
    public static bool IsAdultsOnly(this Product product) => throw new NotSupportedException("Reference stub");
    public static bool IsPremium(this Product product) => throw new NotSupportedException("Reference stub");
    public static bool IsVending(this Product product) => throw new NotSupportedException("Reference stub");
    public static bool IsInfinite(this Product product) => throw new NotSupportedException("Reference stub");
    public static bool IsElite(this Product product) => throw new NotSupportedException("Reference stub");
    public static int GetPrice(this Product product) => throw new NotSupportedException("Reference stub");
    public static string GetName(this Product product) => throw new NotSupportedException("Reference stub");
    public static Entity GetRack(this Product product) => throw new NotSupportedException("Reference stub");
    public static Season? GetSeason(this Product product) => throw new NotSupportedException("Reference stub");
    public static bool IsInSeason(this Product product) => throw new NotSupportedException("Reference stub");
}
