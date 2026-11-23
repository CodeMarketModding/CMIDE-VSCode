// API reference only. The game supplies the implementation.
using System;
using System.Collections.Generic;
namespace CodeMarket.SDK;

public class Robot
{
    public bool Move(Direction direction) => throw new NotSupportedException("Reference stub");
    public void Turn(Direction direction) => throw new NotSupportedException("Reference stub");
    public int GetX() => throw new NotSupportedException("Reference stub");
    public int GetY() => throw new NotSupportedException("Reference stub");
    public Direction GetFacing() => throw new NotSupportedException("Reference stub");
    public int GetNumber() => throw new NotSupportedException("Reference stub");
    public bool CanMove(Direction direction) => throw new NotSupportedException("Reference stub");
    public Entity Look(Direction direction) => throw new NotSupportedException("Reference stub");
    public bool IsFacing(Entity entity) => throw new NotSupportedException("Reference stub");
    public bool Pick(Product product) => throw new NotSupportedException("Reference stub");
    public int GetLoad() => throw new NotSupportedException("Reference stub");
    public int GetCapacity() => throw new NotSupportedException("Reference stub");
    public bool Has(Product product) => throw new NotSupportedException("Reference stub");
    public List<Product> GetCarried() => throw new NotSupportedException("Reference stub");
    public List<Product> GetList() => throw new NotSupportedException("Reference stub");
    public bool IsAtPickup() => throw new NotSupportedException("Reference stub");
    public Shelf GetShelf() => throw new NotSupportedException("Reference stub");
    public bool PutOnShelf(Product product) => throw new NotSupportedException("Reference stub");
    public bool IsAtTruck() => throw new NotSupportedException("Reference stub");
    public List<Product> GetDelivery() => throw new NotSupportedException("Reference stub");
    public bool IsAtRegister() => throw new NotSupportedException("Reference stub");
    public Customer GetCustomer() => throw new NotSupportedException("Reference stub");
    public Order TakeOrder() => throw new NotSupportedException("Reference stub");
    public bool IsAtBag() => throw new NotSupportedException("Reference stub");
    public bool PutInBag(Product product) => throw new NotSupportedException("Reference stub");
}
