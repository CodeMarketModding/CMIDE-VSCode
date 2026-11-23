// API reference only; the game supplies the implementation.
import java.util.List;
public class Store {
    public int getWidth() { throw new UnsupportedOperationException("Reference stub"); }
    public int getHeight() { throw new UnsupportedOperationException("Reference stub"); }
    public boolean isFree(int x, int y) { throw new UnsupportedOperationException("Reference stub"); }
    public Entity getEntity(int x, int y) { throw new UnsupportedOperationException("Reference stub"); }
    public Cell getCashierCell(int x, int y) { throw new UnsupportedOperationException("Reference stub"); }
    public Cell getPackerCell(int x, int y) { throw new UnsupportedOperationException("Reference stub"); }
    public Direction getRegisterSide(int x, int y) { throw new UnsupportedOperationException("Reference stub"); }
    public int getRegisterNumber(int x, int y) { throw new UnsupportedOperationException("Reference stub"); }
    public int getStock(int x, int y) { throw new UnsupportedOperationException("Reference stub"); }
    public Cell find(Entity entity) { throw new UnsupportedOperationException("Reference stub"); }
    public List<Cell> findAll(Entity entity) { throw new UnsupportedOperationException("Reference stub"); }
    public List<Direction> getPickupDirections(int x, int y, Product product) { throw new UnsupportedOperationException("Reference stub"); }
    public int getHour() { throw new UnsupportedOperationException("Reference stub"); }
    public int getMinute() { throw new UnsupportedOperationException("Reference stub"); }
    public int getDay() { throw new UnsupportedOperationException("Reference stub"); }
    public Season getSeason() { throw new UnsupportedOperationException("Reference stub"); }
    public Customer getWaitingCustomer() { throw new UnsupportedOperationException("Reference stub"); }
    public int getMoney() { throw new UnsupportedOperationException("Reference stub"); }
    public int getBuyPrice(Product product) { throw new UnsupportedOperationException("Reference stub"); }
    public int getTruckCapacity() { throw new UnsupportedOperationException("Reference stub"); }
    public boolean callDelivery(List<Product> goods) { throw new UnsupportedOperationException("Reference stub"); }
    public int getRemaining(Product product) { throw new UnsupportedOperationException("Reference stub"); }
    public boolean isTruckHere() { throw new UnsupportedOperationException("Reference stub"); }
    public boolean isTruckAway() { throw new UnsupportedOperationException("Reference stub"); }
    public int getGarageX() { throw new UnsupportedOperationException("Reference stub"); }
    public int getGarageY() { throw new UnsupportedOperationException("Reference stub"); }
    public Direction getGarageSide() { throw new UnsupportedOperationException("Reference stub"); }
    public boolean sendTruckAway() { throw new UnsupportedOperationException("Reference stub"); }
}
