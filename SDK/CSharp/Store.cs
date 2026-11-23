// API reference only. The game supplies the implementation.
using System;
using System.Collections.Generic;
namespace CodeMarket.SDK;

public class Store
{
    public int GetWidth() => throw new NotSupportedException("Reference stub");
    public int GetHeight() => throw new NotSupportedException("Reference stub");
    public bool IsFree(int x, int y) => throw new NotSupportedException("Reference stub");
    public Entity GetEntity(int x, int y) => throw new NotSupportedException("Reference stub");
    public Cell GetCashierCell(int x, int y) => throw new NotSupportedException("Reference stub");
    public Cell GetPackerCell(int x, int y) => throw new NotSupportedException("Reference stub");
    public Direction GetRegisterSide(int x, int y) => throw new NotSupportedException("Reference stub");
    public int GetRegisterNumber(int x, int y) => throw new NotSupportedException("Reference stub");
    public int GetStock(int x, int y) => throw new NotSupportedException("Reference stub");
    public Cell Find(Entity entity) => throw new NotSupportedException("Reference stub");
    public List<Cell> FindAll(Entity entity) => throw new NotSupportedException("Reference stub");
    public List<Direction> GetPickupDirections(int x, int y, Product product) => throw new NotSupportedException("Reference stub");
    public int GetHour() => throw new NotSupportedException("Reference stub");
    public int GetMinute() => throw new NotSupportedException("Reference stub");
    public int GetDay() => throw new NotSupportedException("Reference stub");
    public Season GetSeason() => throw new NotSupportedException("Reference stub");
    public Customer GetWaitingCustomer() => throw new NotSupportedException("Reference stub");
    public int GetMoney() => throw new NotSupportedException("Reference stub");
    public int GetBuyPrice(Product product) => throw new NotSupportedException("Reference stub");
    public int GetTruckCapacity() => throw new NotSupportedException("Reference stub");
    public bool CallDelivery(List<Product> goods) => throw new NotSupportedException("Reference stub");
    public int GetRemaining(Product product) => throw new NotSupportedException("Reference stub");
    public bool IsTruckHere() => throw new NotSupportedException("Reference stub");
    public bool IsTruckAway() => throw new NotSupportedException("Reference stub");
    public int GetGarageX() => throw new NotSupportedException("Reference stub");
    public int GetGarageY() => throw new NotSupportedException("Reference stub");
    public Direction GetGarageSide() => throw new NotSupportedException("Reference stub");
    public bool SendTruckAway() => throw new NotSupportedException("Reference stub");
}
